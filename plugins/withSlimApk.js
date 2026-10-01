// APK ছোট করার প্লাগইন: শুধু আধুনিক ফোনের (arm64) কোড রাখে — প্রায় সব আজকের Android ফোনই arm64
const { withGradleProperties } = require('expo/config-plugins');
module.exports = (config) =>
  withGradleProperties(config, (c) => {
    const set = (key, value) => {
      const i = c.modResults.findIndex((p) => p.type === 'property' && p.key === key);
      if (i >= 0) c.modResults[i].value = value; else c.modResults.push({ type: 'property', key, value });
    };
    set('reactNativeArchitectures', 'arm64-v8a');
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    return c;
  });
