import { common, createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';

const lowlight = createLowlight(common);

lowlight.register({
  bash,
  go,
  javascript,
  json,
  python,
  typescript,
});

lowlight.registerAlias({
  bash: ['shell', 'sh'],
  javascript: ['js'],
  python: ['py'],
  typescript: ['ts'],
});

export { lowlight };
