import { createApiClient } from './api';

export async function uploadFile(file: { uri: string; name?: string; type?: string }) {
  const api = createApiClient();
  const form = new FormData();
  const filename = file.name || file.uri.split('/').pop() || `upload_${Date.now()}`;
  const contentType = file.type || 'application/octet-stream';
  form.append('file', {
    // @ts-ignore React Native FormData file shape
    uri: file.uri,
    name: filename,
    type: contentType,
  } as any);
  const res = await api.post('/files', form as any, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data; // Expecting { url, key, ... }
}


