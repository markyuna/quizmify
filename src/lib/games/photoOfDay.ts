import { GuestGameKey, registerGuestGame } from "@/lib/guestPlay";
import { canonicalCountryName } from "@/lib/geo-countries";

type PhotoCredit = {
  author: string;
  license: string;
  licenseUrl: string;
};

type PhotoEntry = {
  country: string;
  place: string;
  image: string;
  credit: PhotoCredit;
};

// Locally hosted (public/images/photo-du-jour/), not hotlinked from
// Wikimedia -- downloaded once and converted to webp. Every entry's
// license was checked on its Commons file page before inclusion; all are
// free for commercial reuse with attribution, which is shown on the card
// (see PhotoOfDayCard.tsx) to satisfy that requirement.
const PHOTOS: readonly PhotoEntry[] = [
  {
    country: "France",
    place: "Eiffel Tower",
    image: "/images/photo-du-jour/france-eiffel-tower.webp",
    credit: { author: "Benh Lieu Song", license: "Public Domain", licenseUrl: "https://en.wikipedia.org/wiki/Public_domain" },
  },
  {
    country: "Brazil",
    place: "Christ the Redeemer",
    image: "/images/photo-du-jour/brazil-christ-redeemer.webp",
    credit: { author: "Laszlo Ilyes", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" },
  },
  {
    country: "Egypt",
    place: "Great Pyramid of Giza",
    image: "/images/photo-du-jour/egypt-great-pyramid.webp",
    credit: { author: "Kallerna", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  },
  {
    country: "India",
    place: "Taj Mahal",
    image: "/images/photo-du-jour/india-taj-mahal.webp",
    credit: { author: "Joel Godwin", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  },
  {
    country: "United States",
    place: "Statue of Liberty",
    image: "/images/photo-du-jour/usa-statue-of-liberty.webp",
    credit: { author: "Iolaire~commonswiki", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  },
  {
    country: "Australia",
    place: "Sydney Opera House",
    image: "/images/photo-du-jour/australia-sydney-opera-house.webp",
    credit: { author: "Bjarte Sorensen", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  },
  {
    country: "Peru",
    place: "Machu Picchu",
    image: "/images/photo-du-jour/peru-machu-picchu.webp",
    credit: { author: "Pedro Szekely", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/" },
  },
  {
    country: "China",
    place: "Great Wall of China",
    image: "/images/photo-du-jour/china-great-wall.webp",
    credit: { author: "Eunice winG", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/" },
  },
  {
    country: "Italy",
    place: "Colosseum",
    image: "/images/photo-du-jour/italy-colosseum.webp",
    credit: { author: "Silviomerci1971", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  },
  {
    country: "United Kingdom",
    place: "Big Ben",
    image: "/images/photo-du-jour/uk-big-ben.webp",
    credit: { author: "Minielena313", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  },
  {
    country: "Japan",
    place: "Mount Fuji",
    image: "/images/photo-du-jour/japan-mount-fuji.webp",
    credit: { author: "Subramaniam K V", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" },
  },
];

function pickPhotoForDate(dateKey: string): PhotoEntry {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return PHOTOS[hash % PHOTOS.length];
}

type PhotoOfDayAnswer = { guess: string };

registerGuestGame({
  gameKey: GuestGameKey.photo_of_day,

  // Language-independent -- the photo itself doesn't change per locale,
  // only the surrounding UI copy does (see GuestGames.photoOfDay in
  // messages/*.json).
  generateChallenge(dateKey): PhotoEntry {
    return pickPhotoForDate(dateKey);
  },

  // Neither `country` nor `place` (the landmark name) ever reaches the
  // client here -- sending the landmark name would hand over the answer
  // outright ("Eiffel Tower" already tells you the country). Only the
  // image and its attribution go out; both are revealed already by the
  // photo itself, so there's nothing left to leak.
  toClientChallenge(payload) {
    const { image, credit } = payload as PhotoEntry;
    return { image, credit };
  },

  grade(payload, answer) {
    const { country, place, credit } = payload as PhotoEntry;
    const { guess } = answer as PhotoOfDayAnswer;

    const guessedCanonical = canonicalCountryName(typeof guess === "string" ? guess : null);
    const isCorrect = guessedCanonical !== null && guessedCanonical === country;

    return {
      isCorrect,
      resultPayload: { country, place, credit, guess: guessedCanonical ?? guess },
    };
  },
});
