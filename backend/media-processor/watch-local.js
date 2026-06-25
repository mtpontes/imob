// Define as variaveis de ambiente antes de carregar o index.js e o SDK
process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

const { S3Client, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { handler } = require('./index');

const BUCKET_NAME = 'imob-app-bucket';

const s3 = new S3Client({
    endpoint: process.env.AWS_ENDPOINT_URL,
    region: process.env.AWS_REGION,
    forcePathStyle: true
});

function getThumbnailKey(originalKey) {
    const uploadIndex = originalKey.indexOf('/uploads/');
    if (uploadIndex === -1) {
        return originalKey + '_thumb.jpg';
    }
    const prefix = originalKey.substring(0, uploadIndex + 9);
    const filename = originalKey.substring(uploadIndex + 9);
    
    const lastDot = filename.lastIndexOf('.');
    const nameWithoutExt = lastDot === -1 ? filename : filename.substring(0, lastDot);
    
    return prefix + 'thumbnails/' + nameWithoutExt + '.jpg';
}

async function checkThumbnailExists(key) {
    const thumbKey = getThumbnailKey(key);
    try {
        await s3.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: thumbKey
        }));
        return true; // Thumbnail existe
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            return false; // Thumbnail nao existe
        }
        // Se for outro erro, exibe mas assume que nao existe
        console.error(`Erro ao verificar thumbnail para ${key}:`, err.message);
        return false;
    }
}

async function runWatcher() {
    try {
        const response = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME
        }));

        if (!response.Contents) {
            return;
        }

        // Filtra para pegar apenas arquivos que sao de upload e nao sao thumbnails nem a pasta thumbnails em si
        const originalObjects = response.Contents.filter(obj => 
            obj.Key.includes('/uploads/') &&
            !obj.Key.includes('/thumbnails/')
        );

        for (const obj of originalObjects) {
            const exists = await checkThumbnailExists(obj.Key);
            
            if (!exists) {
                console.log(`[Watcher] Nova midia encontrada no LocalStack S3: ${obj.Key}. Gerando thumbnail...`);
                
                // Mock do evento S3 do ObjectCreated
                const fakeEvent = {
                    Records: [
                        {
                            s3: {
                                bucket: { name: BUCKET_NAME },
                                object: { key: obj.Key }
                            }
                        }
                    ]
                };

                // Executa a Lambda localmente de forma sincrona
                await handler(fakeEvent);
            }
        }
    } catch (err) {
        // Ignora erros de conexao se o LocalStack ainda estiver iniciando
        if (err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
            console.log('[Watcher] Aguardando inicializacao do LocalStack S3 na porta 4566...');
        } else {
            console.error('[Watcher] Erro na execucao do monitor de midias:', err.message);
        }
    }
}

console.log('[Watcher] Monitor de uploads de midia local iniciado (LocalStack).');
console.log(`[Watcher] Monitorando bucket: ${BUCKET_NAME} no endpoint http://localhost:4566`);
console.log('[Watcher] Pressione Ctrl+C para encerrar.');

// Executa imediatamente e depois a cada 3 segundos
runWatcher();
setInterval(runWatcher, 3000);
