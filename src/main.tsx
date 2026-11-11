import { createRoot } from 'react-dom/client';
import App from './App';
import { pickDatesInKitCalendar } from './lib/date-picker';
import { loadImagesEagerly } from './lib/eager-images';
import { changePagesSmoothly } from './lib/page-change';
import { PageErrorBoundary } from './lib/page-error';
import { keepFacesInCroppedPhotos } from './lib/photo-crop';
import { keepSentFormsInView } from './lib/sent-in-view';
import './index.css';
// After index.css, so the default look wins over Tailwind's reset.
import './base.css';

// The first screen first, then every other picture in the background, before anyone scrolls (src/lib/eager-images.ts).
loadImagesEagerly();
// A form that turns into its thank-you shows it on screen, not the footer below it (src/lib/sent-in-view.ts).
keepSentFormsInView();
// On a computer every date field opens the kit's calendar, not the system's (src/lib/date-picker.tsx).
pickDatesInKitCalendar();
// A tall or square photo cropped into a wider box keeps the face near its top (src/lib/photo-crop.ts).
keepFacesInCroppedPhotos();
// A link to another page cross-fades to it finished, pictures and headline in place (src/lib/page-change.ts).
changePagesSmoothly();

// Published build only: the preview shows errors through the platform instead.
const app = import.meta.env.DEV ? (
  <App />
) : (
  <PageErrorBoundary>
    <App />
  </PageErrorBoundary>
);

// No StrictMode: it runs the page's start-up code twice in the preview only, so the preview
// would behave unlike the live site.
createRoot(document.getElementById('root')!).render(app);
