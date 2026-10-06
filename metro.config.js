const path = require('path');
const fs = require('fs');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [__dirname, path.resolve(__dirname, 'src')];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const basePath = path.resolve(__dirname, 'src', moduleName.slice(2));
    const platformExts = platform === 'web' ? [`${basePath}.web.tsx`, `${basePath}.web.ts`] : [];
    const candidates = [
      ...platformExts,
      `${basePath}.tsx`,
      `${basePath}.ts`,
      path.join(basePath, 'index.tsx'),
      path.join(basePath, 'index.ts'),
    ];
    const filePath = candidates.find((candidate) => fs.existsSync(candidate));
    if (filePath) return { type: 'sourceFile', filePath };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
