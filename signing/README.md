# Signing key

`sawaari.jks` signs the APK so Android accepts it (the default React Native
debug key is public and recent Pixels refuse it). Alias `sawaari`, password
`sawaari123`.

It's committed on purpose: this is a film prop, not a store app, and a fixed key
means new builds install over old ones. Don't reuse it for a real app.
