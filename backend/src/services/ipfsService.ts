import FormData from 'form-data';
import https from 'https';

/**
 * IPFS 去中心化存储服务
 * 通过 Pinata API 上传文件到 IPFS 网络
 */

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

type PinataAuth =
  | { mode: 'jwt'; jwt: string }
  | { mode: 'apiKey'; apiKey: string; apiSecret: string };

function getPinataAuth(): PinataAuth | null {
  const jwt = process.env.PINATA_JWT;
  if (jwt) {
    return { mode: 'jwt', jwt };
  }

  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;
  if (apiKey && apiSecret) {
    return { mode: 'apiKey', apiKey, apiSecret };
  }

  return null;
}

/**
 * 检查 Pinata 是否已配置
 */
export function isConfigured(): boolean {
  return !!getPinataAuth();
}

/**
 * 获取 IPFS Gateway URL
 */
export function getIPFSUrl(cid: string): string {
  return `${PINATA_GATEWAY}/${cid}`;
}

/**
 * 上传文件到 IPFS（通过 Pinata）
 * @param buffer - 文件二进制数据
 * @param fileName - 文件名（用于 Pinata metadata）
 * @returns IPFS CID
 */
export async function uploadToIPFS(buffer: Buffer, fileName: string): Promise<string> {
  const auth = getPinataAuth();
  if (!auth) {
    throw new Error('未配置 Pinata 凭据（PINATA_JWT 或 PINATA_API_KEY/PINATA_API_SECRET），无法上传 IPFS');
  }

  // 最多重试 2 次
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const cid = await _uploadWithFetch(buffer, fileName, auth);
      return cid;
    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️ IPFS 上传第 ${attempt} 次尝试失败:`, err.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000 * attempt)); // 退避等待
      }
    }
  }

  throw lastError || new Error('IPFS 上传失败');
}

/**
 * 使用 Node.js https 模块上传（兼容性最好）
 */
function _uploadWithFetch(buffer: Buffer, fileName: string, auth: PinataAuth): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', buffer, {
      filename: fileName,
      contentType: 'application/pdf',
    });

    // Pinata metadata
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        system: 'intern-cert-blockchain',
        type: 'certificate',
        uploadTime: new Date().toISOString(),
      },
    });
    form.append('pinataMetadata', metadata);

    // Pinata options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    form.append('pinataOptions', options);

    const authHeaders = auth.mode === 'jwt'
      ? { 'Authorization': `Bearer ${auth.jwt}` }
      : {
        pinata_api_key: auth.apiKey,
        pinata_secret_api_key: auth.apiSecret,
      };

    const reqOptions = {
      hostname: 'api.pinata.cloud',
      path: '/pinning/pinFileToIPFS',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        ...authHeaders,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Pinata API 返回 ${res.statusCode}: ${data}`));
            return;
          }
          const json = JSON.parse(data);
          if (json.IpfsHash) {
            resolve(json.IpfsHash);
          } else {
            reject(new Error('Pinata 返回无效响应: ' + data));
          }
        } catch (e) {
          reject(new Error('解析 Pinata 响应失败: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('IPFS 上传超时（30秒）'));
    });

    form.pipe(req);
  });
}

// 启动检查
if (isConfigured()) {
  console.log('📦 IPFS 服务已就绪（Pinata）');
} else {
  console.warn('⚠️ Pinata 凭据未配置（PINATA_JWT 或 PINATA_API_KEY/PINATA_API_SECRET），IPFS 上传功能不可用');
}
