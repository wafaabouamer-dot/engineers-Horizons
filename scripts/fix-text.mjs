// `pnpm fix:text`: raise every font size under 12px in src/ and index.html to 12px, in one step.
import { raiseSmallText } from './text-sizes.mjs';

const raised = raiseSmallText(process.cwd());
console.log(
  raised
    ? `[fix:text] raised ${raised} size(s) under 12px to 12px. Make anything people read (paragraphs, ` +
        'descriptions, form fields, card text) 16px, then run pnpm verify.'
    : '[fix:text] no text under 12px.',
);
