// Backward-compatible entry point for the local, no-phone-call conversation harness.
// The implementation lives in test_conversation.ts so both commands use one test flow.
console.log('This test does NOT validate Deepgram, LiveKit, or real TTS.');
require('./test_conversation');
