import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

const s3 = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  forcePathStyle: config.s3.forcePathStyle,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
});

export async function uploadAudio(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `s3://${config.s3.bucket}/${key}`;
}

export async function signedAudioUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }), { expiresIn: 3600 });
}

export function audioKeyFor(sessionId: string): string {
  return `sessions/${sessionId}.m4a`;
}

export async function fetchAudioBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: config.s3.bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return Buffer.concat(chunks);
}
