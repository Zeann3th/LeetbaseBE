import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

class S3StorageService {
  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CF_ACCESS_KEY_ID,
        secretAccessKey: process.env.CF_SECRET_ACCESS_KEY,
      },
    });
  }
  async getSignedUploadURL(key, expiresIn = 300) {
    const url = await getSignedUrl(this.client, new PutObjectCommand({
      Bucket: process.env.CF_BUCKET,
      Key: key,
    }),
      { expiresIn }
    );
    return url;
  }
  async getDownloadUrl(key) {
    const { Body } = await this.client.send(new GetObjectCommand({
      Bucket: process.env.CF_BUCKET,
      Key: key,
    }));

    const streamToString = async (stream) => {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString("utf-8");
    };

    const fileContent = await streamToString(Body);

    return fileContent;
  }
}

const s3 = new S3StorageService();

export default s3;


