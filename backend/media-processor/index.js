const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const os = require('os');

let ffmpegInitialized = false;
function initializeFfmpeg() {
    if (ffmpegInitialized) return;
    try {
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        if (fs.existsSync(ffmpegPath)) {
            ffmpeg.setFfmpegPath(ffmpegPath);
            console.log('FFmpeg configurado com o path:', ffmpegPath);
        } else {
            console.warn('Binario do FFmpeg nao encontrado no caminho:', ffmpegPath);
        }
        ffmpegInitialized = true;
    } catch (err) {
        console.warn('Nao foi possivel inicializar o ffmpeg-installer:', err.message);
    }
}

const s3Config = {};
if (process.env.AWS_ENDPOINT_URL) {
    s3Config.endpoint = process.env.AWS_ENDPOINT_URL;
    s3Config.forcePathStyle = true;
    s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    };
}
const s3 = new S3Client(s3Config);

// Helper para obter extensao
function getExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Helper para verificar se e video
function isVideo(filename) {
    const ext = getExtension(filename);
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
}

// Helper para verificar se e imagem
function isImage(filename) {
    const ext = getExtension(filename);
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'bmp'].includes(ext);
}

// Converte a chave original para a chave de thumbnail correspondente
function getThumbnailKey(originalKey) {
    const uploadIndex = originalKey.indexOf('/uploads/');
    if (uploadIndex === -1) {
        return originalKey + '_thumb.jpg';
    }
    const prefix = originalKey.substring(0, uploadIndex + 9); // inclui "/uploads/"
    const filename = originalKey.substring(uploadIndex + 9);
    
    const lastDot = filename.lastIndexOf('.');
    const nameWithoutExt = lastDot === -1 ? filename : filename.substring(0, lastDot);
    
    return prefix + 'thumbnails/' + nameWithoutExt + '.jpg';
}

// Salva o stream do S3 em um arquivo local
function saveStreamToFile(readableStream, filePath) {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        readableStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

exports.handler = async (event) => {
    console.log('Evento recebido:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const rawKey = record.s3.object.key;
        const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));

        console.log(`Processando objeto: Bucket=${bucket}, Key=${key}`);

        // Protecao contra loop de processamento
        if (key.includes('/thumbnails/')) {
            console.log('Arquivo ja e uma thumbnail. Ignorando.');
            continue;
        }

        if (!key.includes('/uploads/')) {
            console.log('Arquivo nao esta na pasta uploads. Ignorando.');
            continue;
        }

        if (!isImage(key) && !isVideo(key)) {
            console.log('Formato de arquivo nao suportado para geracao de thumbnail. Ignorando.');
            continue;
        }

        const destKey = getThumbnailKey(key);
        console.log(`Destino da thumbnail: Key=${destKey}`);

        try {
            // 1. Obter o objeto do S3
            const getResponse = await s3.send(new GetObjectCommand({
                Bucket: bucket,
                Key: key
            }));

            const stream = getResponse.Body;
            if (!stream) {
                throw new Error('Corpo do objeto do S3 esta vazio.');
            }

            let thumbnailBuffer;

            if (isImage(key)) {
                // 2a. Processar Imagem via Sharp
                console.log('Processando imagem com Sharp...');
                
                // Converte o stream do S3 em um buffer
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const inputBuffer = Buffer.concat(chunks);

                thumbnailBuffer = await sharp(inputBuffer)
                    .resize({
                        width: 300,
                        height: 300,
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 80 })
                    .toBuffer();

            } else if (isVideo(key)) {
                // 2b. Processar Video via FFmpeg
                console.log('Processando video com FFmpeg...');
                initializeFfmpeg();
                
                const uniqueId = Math.random().toString(36).substring(2, 9);
                const tempVideoPath = path.join(os.tmpdir(), `video_${uniqueId}.mp4`);
                const tempImgPath = path.join(os.tmpdir(), `thumb_${uniqueId}.jpg`);

                try {
                    // Salva stream do S3 em arquivo temporario local no Lambda (/tmp)
                    await saveStreamToFile(stream, tempVideoPath);
                    console.log(`Video salvo temporariamente em: ${tempVideoPath}`);

                    // Executa o ffmpeg para extrair o primeiro frame (00:00:00)
                    await new Promise((resolve, reject) => {
                        ffmpeg(tempVideoPath)
                            .screenshots({
                                timestamps: ['00:00:00.000'],
                                filename: path.basename(tempImgPath),
                                folder: path.dirname(tempImgPath),
                                size: '300x?'
                            })
                            .on('end', () => {
                                console.log('Frame de video extraido com sucesso.');
                                resolve();
                            })
                            .on('error', (err) => {
                                console.error('Erro no FFmpeg:', err);
                                reject(err);
                            });
                    });

                    // Le a imagem gerada do disco
                    if (!fs.existsSync(tempImgPath)) {
                        throw new Error('Arquivo de thumbnail temporario nao foi gerado pelo FFmpeg.');
                    }
                    thumbnailBuffer = fs.readFileSync(tempImgPath);

                } finally {
                    // Limpeza de arquivos temporarios no /tmp
                    if (fs.existsSync(tempVideoPath)) {
                        fs.unlinkSync(tempVideoPath);
                    }
                    if (fs.existsSync(tempImgPath)) {
                        fs.unlinkSync(tempImgPath);
                    }
                }
            }

            // 3. Fazer o upload da thumbnail gerada no S3
            if (thumbnailBuffer) {
                await s3.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: destKey,
                    Body: thumbnailBuffer,
                    ContentType: 'image/jpeg'
                }));
                console.log(`Thumbnail enviada com sucesso para: ${destKey}`);
            }

        } catch (error) {
            console.error(`Erro ao processar arquivo ${key}:`, error);
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Processamento concluido' })
    };
};
