import { bucketName, s3Client } from "@/libs/s3-storage";
import { generateKey } from "@/libs/utils";
import { withApi } from "@/libs/withApi";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateMultipartUploadCommand, GetBucketCorsCommand, ListMultipartUploadsCommand, PutBucketCorsCommand, UploadPartCommand, } from "@aws-sdk/client-s3";


const CheckCORS = async (domain: string) => {

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const httpOrigin = `http://${cleanDomain}`;
    const httpsOrigin = `https://${cleanDomain}`;
    const originsToAdd = [httpOrigin, httpsOrigin];

    const current = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    let rules = current.CORSRules ?? [];

    const alreadyAllowed = rules.some(rule =>
        rule.AllowedOrigins?.some(origin => originsToAdd.includes(origin))
    );

    if (alreadyAllowed) {
        return {
            status: true,
            message: "Origin already allowed in CORS"
        };
    }

    // Remove * wildcard from all rules
    for (const rule of rules) {
        rule.AllowedOrigins = (rule.AllowedOrigins || []).filter(o => o !== "*");
    }

    // Add origins to first rule or create new one
    if (rules.length > 0) {
        const existingOrigins = rules[0].AllowedOrigins ?? [];
        const newOrigins = [...existingOrigins, ...originsToAdd.filter(o => !existingOrigins.includes(o))];
        rules[0].AllowedOrigins = newOrigins;
        rules[0].ID = cleanDomain;
        rules[0].ExposeHeaders = ["ETag", "Content-Type", "Content-Length", "x-amz-request-id"]
    } else {
        rules.push({
            ID: cleanDomain,
            AllowedOrigins: originsToAdd,
            AllowedMethods: ["PUT", "POST", "GET"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Type", "Content-Length", "x-amz-request-id"],
            MaxAgeSeconds: 3600
        });
    }

    // Final clean-up and apply
    rules = rules
        .filter(r => r.AllowedOrigins?.length && r.AllowedMethods?.length)
        .map(r => ({
            ID: r.ID,
            AllowedOrigins: r.AllowedOrigins!.filter(Boolean),
            AllowedMethods: r.AllowedMethods!,
            AllowedHeaders: r.AllowedHeaders || ["*"],
            ExposeHeaders: r.ExposeHeaders || ["ETag", "Content-Type", "Content-Length", "x-amz-request-id"],
            MaxAgeSeconds: r.MaxAgeSeconds || 3600
        }));

    await s3Client.send(new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: { CORSRules: rules }
    }));

    return {
        status: true,
        message: "CORS updated successfully"
    };
};




export const POST = withApi(async (req) => {

    const json = await req.json();
    if (!json.fileType) throw new Error("400: Invalid request!");


    await CheckCORS("localhost:3040");

    const Key = (json.Key || null) as string | null;
    const ContentType = json.fileType;

    // Key can come from request if you want to resume by client-provided key
    // otherwise generate new
    const objKey = Key || `drive/${generateKey(18)}`;

    // 🔍 check if there's already an incomplete multipart upload
    const listCommand = new ListMultipartUploadsCommand({
        Bucket: bucketName,
        Prefix: objKey,
    });
    const listResp = await s3Client.send(listCommand);

    let existingUploadId: string | undefined;

    if (listResp.Uploads) {
        const found = listResp.Uploads.find((u) => u.Key === objKey);
        if (found) {
            existingUploadId = found.UploadId;
        }
    }

    // ✅ If we found one, return it instead of creating new
    if (existingUploadId) {
        return {
            status: true,
            message: "Resuming existing upload",
            data: {
                Key: objKey,
                UploadId: existingUploadId,
            },
        };
    }

    // 🚀 Otherwise start new upload
    const createCommand = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: objKey,
        ContentType,
    });
    const response = await s3Client.send(createCommand);

    if (!response.UploadId || !response.Key) {
        throw new Error("500: Failed to init upload");
    }

    return {
        status: true,
        message: "New upload started",
        data: {
            Key: response.Key,
            UploadId: response.UploadId,
        },
    };
});


export const GET = withApi<any>(async (req) => {

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('Key');
    const uploadId = searchParams.get('UploadId');
    const partNumber = searchParams.get('PartNumber');
    if (!key || !uploadId || !partNumber) throw new Error("400: Invalid request!");

    const command = new UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: parseInt(partNumber),
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
        status: true,
        message: 'Presigned URL generated successfully',
        data: {
            url
        }
    }
});



// export const DELETE = withApi<any>(async (req) => {
//     const { fileId } = await req.json();
//     if (!fileId) throw new Error("400: Missing fileId");

//     const source = await SystemSource(req.domain);
//     const repoFile = source.getRepository(DriveFile);
//     const repoFolder = source.getRepository(DriveFolder);

//     const file = await repoFile.findOneBy({ id: fileId, upload: Not(IsNull()) });
//     if (!file || !file.upload?.id || !file.upload?.key) {
//         throw new Error("Upload session not found or already completed");
//     }

//     const { id: uploadId, key } = file.upload;

//     // Abort multipart upload on S3
//     const abortCommand = new AbortMultipartUploadCommand({
//         Bucket: bucketName,
//         Key: key,
//         UploadId: uploadId,
//     });
//     await s3Client.send(abortCommand);

//     if (file.folId) {
//         await repoFolder.decrement({ id: file.folId }, "filesCount", 1);
//     }
//     // Delete file record
//     await repoFile.delete({ id: fileId });
//     await source.destroy();

//     return {
//         status: true,
//         message: "Upload aborted and file record deleted",
//     };
// });