import { NextResponse } from 'next/server';
import { getConnection } from '@/data-source';
import { File } from '@/entity/File';
import { bucketName, s3Client } from '@/libs/s3-storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const SMALL_FILE_THRESHOLD = 2 * 1024 * 1024; // 2 MB

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const secFetchMode = req.headers.get('sec-fetch-mode');
    if (secFetchMode === 'navigate') {
        return NextResponse.redirect(new URL(`/opener/${params.id}`, req.url));
    }

    const connection = await getConnection();
    const fileRepository = connection.getRepository(File);
    const file = await fileRepository.findOneBy({ id: params.id });

    if (!file) {
        return NextResponse.redirect(new URL('/404', req.url));
    }
    // @ts-ignore
    if (!file.meta?.Key) {
        return NextResponse.redirect(new URL('/error', req.url));
    }

    // @ts-ignore
    const contentType = file.meta?.mimeType || 'application/octet-stream';

    try {
        const s3Res = await s3Client.send(
            new GetObjectCommand({
                Bucket: bucketName,
                // @ts-ignore
                Key: file.meta.Key,
            })
        );

        if (!s3Res.Body) {
            return NextResponse.redirect(new URL('/404', req.url));
        }

        const size = Number(s3Res.ContentLength) || 0;

        if (size > 0 && size <= SMALL_FILE_THRESHOLD) {
            // Buffer small files
            const buffer = await s3Res.Body.transformToByteArray();
            return new NextResponse(buffer as any, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `inline; filename="${file.name}"`,
                    'Content-Length': size.toString(),
                },
            });
        } else {
            // Stream large files
            const bodyStream =
                s3Res.Body instanceof ReadableStream
                    ? s3Res.Body
                    : s3Res.Body.transformToWebStream();

            return new NextResponse(bodyStream, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `inline; filename="${file.name}"`,
                    ...(size ? { 'Content-Length': size.toString() } : {}),
                },
            });
        }
    } catch (err) {
        console.error('S3 error:', err);
        return NextResponse.redirect(new URL('/error', req.url));
    }
}
