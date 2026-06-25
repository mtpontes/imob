const { handler } = require('./index');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

// Mocks do AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
    const mockSend = jest.fn();
    return {
        S3Client: jest.fn().mockImplementation(() => ({
            send: mockSend
        })),
        GetObjectCommand: jest.fn(),
        PutObjectCommand: jest.fn()
    };
});

// Mocks do Sharp
jest.mock('sharp', () => {
    const mockResize = jest.fn().mockReturnThis();
    const mockJpeg = jest.fn().mockReturnThis();
    const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('mock-thumbnail-buffer'));
    const mockSharp = jest.fn().mockImplementation(() => ({
        resize: mockResize,
        jpeg: mockJpeg,
        toBuffer: mockToBuffer
    }));
    return mockSharp;
});

// Mocks do FFmpeg e FS
jest.mock('fluent-ffmpeg');
jest.mock('fs');

describe('Media Processor Lambda Handler', () => {
    let s3ClientInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        s3ClientInstance = new S3Client();
    });

    test('deve ignorar arquivos que ja sao thumbnails', async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: 'imob-bucket' },
                        object: { key: 'workspace1/uploads/thumbnails/file.jpg' }
                    }
                }
            ]
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(s3ClientInstance.send).not.toHaveBeenCalled();
    });

    test('deve ignorar extensoes nao suportadas', async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: 'imob-bucket' },
                        object: { key: 'workspace1/uploads/document.pdf' }
                    }
                }
            ]
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(s3ClientInstance.send).not.toHaveBeenCalled();
    });

    test('deve processar imagem com sharp e salvar thumbnail', async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: 'imob-bucket' },
                        object: { key: 'workspace1/uploads/photo.png' }
                    }
                }
            ]
        };

        // Configura mock do GetObject do S3
        const mockStream = {
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('original-image-data');
            }
        };
        s3ClientInstance.send.mockResolvedValueOnce({
            Body: mockStream
        });

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(s3ClientInstance.send).toHaveBeenCalledTimes(2); // GetObject e PutObject
        
        // Verifica se PutObject foi chamado com a chave certa e o buffer do Sharp
        expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
            Bucket: 'imob-bucket',
            Key: 'workspace1/uploads/thumbnails/photo.jpg',
            ContentType: 'image/jpeg',
            Body: Buffer.from('mock-thumbnail-buffer')
        }));
    });

    test('deve processar video com ffmpeg e salvar thumbnail', async () => {
        const event = {
            Records: [
                {
                    s3: {
                        bucket: { name: 'imob-bucket' },
                        object: { key: 'workspace1/uploads/video.mp4' }
                    }
                }
            ]
        };

        // Configura mock do GetObject do S3
        const mockStream = {
            pipe: jest.fn().mockImplementation((dest) => {
                // Simula que o pipe grava com sucesso
                setTimeout(() => {
                    dest.emit('finish');
                }, 10);
                return dest;
            })
        };
        s3ClientInstance.send.mockResolvedValueOnce({
            Body: mockStream
        });

        // Mock do fs.createWriteStream
        const mockWriteStream = {
            on: jest.fn().mockImplementation(function (event, cb) {
                if (event === 'finish') {
                    this.onFinish = cb;
                }
                return this;
            }),
            emit: jest.fn().mockImplementation(function (event) {
                if (event === 'finish' && this.onFinish) {
                    this.onFinish();
                }
                return this;
            })
        };
        fs.createWriteStream.mockReturnValue(mockWriteStream);
        fs.existsSync.mockReturnValue(true); // Simula que a thumb foi gerada no /tmp
        fs.readFileSync.mockReturnValue(Buffer.from('mock-video-frame-buffer'));

        // Mock fluent-ffmpeg chain
        const mockFfmpegInstance = {
            screenshots: jest.fn().mockImplementation((options) => {
                // Simula conclusao do screenshot
                setTimeout(() => mockFfmpegInstance.emit('end'), 10);
                return mockFfmpegInstance;
            }),
            on: jest.fn().mockImplementation(function (event, cb) {
                if (event === 'end') {
                    this.emitEnd = cb;
                }
                return this;
            }),
            emit: jest.fn().mockImplementation(function (event) {
                if (event === 'end' && this.emitEnd) this.emitEnd();
            })
        };
        ffmpeg.mockReturnValue(mockFfmpegInstance);

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        expect(s3ClientInstance.send).toHaveBeenCalledTimes(2); // GetObject e PutObject
        expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({
            Bucket: 'imob-bucket',
            Key: 'workspace1/uploads/thumbnails/video.jpg',
            ContentType: 'image/jpeg',
            Body: Buffer.from('mock-video-frame-buffer')
        }));
    });
});
