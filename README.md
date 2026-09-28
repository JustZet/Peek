# Peek

Extensie Chrome: pune o miniatură vie a tab-ului într-o fereastră mică, mereu
deasupra celorlalte, inclusiv peste alte tab-uri și ferestre Chrome. Browserul
rămâne deschis. Un clic pe miniatură te duce înapoi la tab-ul ei.

## Instalare

1. Deschide `chrome://extensions` (sau `brave://extensions`).
2. Pornește **Developer mode** (dreapta sus).
3. **Load unpacked** → alege folderul ăsta.
4. Opțional: fixează iconița pe bară (piesa de puzzle → piuneza de lângă Peek).

După orice modificare în cod: butonul de reîncărcare de pe cardul extensiei, apoi
reîncarcă și paginile deschise.

## Folosire

Trei feluri de a porni, toate comută (a doua oară închid miniatura):

- **Iconița** de pe bară.
- **Alt+Shift+P**. Se schimbă din `chrome://extensions/shortcuts`.
- **Clic dreapta în pagină → Peek at this tab**. Meniul tab-ului din bara de sus
  nu e deschis extensiilor, deci meniul e pe pagină.

Iconița de pe bară arată starea tab-ului: **gri, cu miniatura goală** când nu e
urmărit, **colorată, cu miniatura plină** cât timp e în miniatură.

**Clic pe miniatură** → înapoi la tab. Dacă ai minimizat tu Chrome între timp,
fereastra revine în starea în care era.

## Limite

- Se vede doar conținutul paginii, fără bara de adrese și tab-uri.
- Miniatura se privește, nu se folosește: clicurile din ea nu ajung în pagină.
- Nu merge pe `chrome://…`, pe Chrome Web Store și pe paginile unde browserul nu
  lasă extensiile. Iconița primește atunci un „!” roșu, iar motivul apare la
  trecerea mouse-ului peste ea.
- O singură miniatură odată. Un video pus de un site în picture-in-picture o
  înlocuiește.
- Extensia nu cere acces la site-uri: rulează doar pe tab-ul pe care o pornești
  tu, și doar atunci.

## Cum funcționează

| Fișier | Ce face |
|---|---|
| `manifest.json` | permisiunile, iconița, scurtătura |
| `background.js` | pornește din iconiță, scurtătură și meniu; dă id-ul fluxului video al tab-ului (`tabCapture`); aduce tab-ul în față; schimbă iconița după stare |
| `peek.js` | definește `__peekToggle`: fereastra *Document Picture-in-Picture*, imaginea tab-ului, clicul pe miniatură |
| `run.js` | cheamă `__peekToggle` după injectarea din iconiță, scurtătură și meniu |

Fereastra picture-in-picture se cere prima, înaintea oricărei așteptări. Browserul
o deschide doar cât clicul tău e încă proaspăt, iar cererea fluxului video trece
prin service worker și durează.
