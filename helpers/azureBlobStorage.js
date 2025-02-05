// helpers/azureBlobStorage.js
import { BlobServiceClient } from '@azure/storage-blob';
import { getSettings } from '../models/AdminSettings.js';

async function storeDataToBlob(containerName, blobName, data) {
  const settings = await getSettings();
  if (!settings || !settings.azureBlobConnectionString) {
    throw new Error('Azure Blob Connection String not configured');
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(settings.azureBlobConnectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const uploadBlobResponse = await blockBlobClient.upload(data, Buffer.byteLength(data));
  return uploadBlobResponse;
}

export { storeDataToBlob };
