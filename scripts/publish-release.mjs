import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OWNER = 'EstebanRiascos';
const REPO = 'LA-MOLIENDA';
const TAG = process.argv[2] || 'v1.1.1';

async function main() {
  if (!TOKEN) {
    console.error('Error: Debes definir la variable de entorno GH_TOKEN o GITHUB_TOKEN.');
    process.exit(1);
  }

  console.log(`Verificando o creando release para ${TAG}...`);

  let release = null;
  const listRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'User-Agent': 'NodeJS',
      Accept: 'application/vnd.github.v3+json',
    },
  });
  const releases = await listRes.json();
  if (Array.isArray(releases)) {
    release = releases.find((r) => r.tag_name === TAG);
  }

  if (!release) {
    console.log(`Creando Release ${TAG}...`);
    const createRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': 'NodeJS',
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        tag_name: TAG,
        target_commitish: 'version-pre-vinculacion-celulares',
        name: `La Molienda POS ${TAG}`,
        body: 'Actualización automática con sincronización bidireccional inmediata a Firebase Firestore.',
        draft: false,
        prerelease: false,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Error creando release: ${createRes.status} ${errText}`);
    }

    release = await createRes.json();
    console.log(`Release creado exitosamente: ID ${release.id}`);
  } else {
    console.log(`Release ya existente: ID ${release.id}`);
  }

  const uploadUrlTemplate = release.upload_url;
  const baseUrl = uploadUrlTemplate.split('{')[0];

  const filesToUpload = [
    { name: 'latest.yml', filePath: path.resolve('release', 'latest.yml'), contentType: 'text/yaml' },
    {
      name: `La-Molienda-POS-Setup-${TAG.replace('v', '')}.exe`,
      filePath: path.resolve('release', `La-Molienda-POS-Setup-${TAG.replace('v', '')}.exe`),
      contentType: 'application/octet-stream',
    },
    {
      name: `La Molienda POS Setup ${TAG.replace('v', '')}.exe`,
      filePath: path.resolve('release', `La Molienda POS Setup ${TAG.replace('v', '')}.exe`),
      contentType: 'application/octet-stream',
    },
    {
      name: `La Molienda POS Setup ${TAG.replace('v', '')}.exe.blockmap`,
      filePath: path.resolve('release', `La Molienda POS Setup ${TAG.replace('v', '')}.exe.blockmap`),
      contentType: 'application/octet-stream',
    },
    {
      name: 'LaMolienda_Comandero.apk',
      filePath: path.resolve('release', 'LaMolienda_Comandero.apk'),
      contentType: 'application/vnd.android.package-archive',
    },
  ];

  const existingAssets = release.assets || [];

  for (const item of filesToUpload) {
    if (!fs.existsSync(item.filePath)) {
      console.warn(`Archivo no encontrado: ${item.filePath}`);
      continue;
    }

    const existing = existingAssets.find((a) => a.name === item.name);
    if (existing) {
      console.log(`Borrando asset previo: ${item.name} (ID: ${existing.id})...`);
      await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${existing.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'User-Agent': 'NodeJS',
        },
      });
    }

    console.log(`Subiendo ${item.name} (${(fs.statSync(item.filePath).size / (1024 * 1024)).toFixed(2)} MB)...`);
    const fileBuffer = fs.readFileSync(item.filePath);

    const uploadRes = await fetch(`${baseUrl}?name=${encodeURIComponent(item.name)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'User-Agent': 'NodeJS',
        'Content-Type': item.contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error(`Error subiendo ${item.name}: ${uploadRes.status} ${err}`);
    } else {
      console.log(`✓ ${item.name} subido correctamente.`);
    }
  }

  console.log(`¡Todos los archivos del Release ${TAG} han sido publicados en GitHub!`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
