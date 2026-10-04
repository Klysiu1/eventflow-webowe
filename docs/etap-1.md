# EventFlow: porownanie z PDF i etap 1

Przeczytano caly EventFlow.pdf (17 stron). Wymagania: monitoring stref i mapa,
alerty, symulacje regulowe, ustawienia, konta i role, wiele wydarzen, historia,
raporty oraz pozniejsza aplikacja mobilna uczestnika.

## Zastany projekt

- Frontend: React, Vite, Tailwind, Zustand, React Router, Axios, Leaflet.
- Jedyna podstrona: DashboardPage. Menu zawieralo nieobslugiwane adresy.
- Backend: Laravel, SQLite w lokalnej konfiguracji, Reverb/Echo.
- PDF proponuje Node/Express, PostgreSQL i Socket.io. Ten etap zachowuje obecny stos.
- Migracje obejmuja wydarzenia, strefy, alerty, zone_logs, symulacje i uzytkownikow.
- Istniejacy SimulationPanel zmienia rzeczywista liczbe osob w strefie; nie jest
  odizolowana symulacja scenariusza. Nie zostal podlaczony jako nowa podstrona.

## Rzeczywiste API

| Endpoint | Dane / zastosowanie |
| --- | --- |
| GET /api/v1/events | Wydarzenia z relacja zones |
| GET /api/v1/events/{eventId}/alerts/active | Nierozwiazane alerty wydarzenia |
| POST /api/v1/zones/update | zoneId, count; zapis liczby osob, log i broadcast |
| GET /api/user | Uzytkownik, wymaga Sanctum |

Echo nasluchuje zone:update i alert:new na kanale events.{id}.
Frontend nadal wybiera pierwsze wydarzenie, zgodnie z zastanym zachowaniem.
Nie ma endpointow historii, recznego zamykania alertow, uruchamiania symulacji,
logowania ani ustawien. Puste metody kontrolerow nie sa gotowymi endpointami.

## Plan podstron

1. Strefy i mapa: lista, obciazenie, filtry, mapa istniejacych wspolrzednych.
2. Alerty: aktywne zgloszenia, filtry, priorytety, szczegoly.
3. Symulacja: scenariusze i wyniki, odizolowane od danych rzeczywistych.
4. Ustawienia i zarzadzanie wydarzeniami po rozbudowie API.

## Zakres wykonany

- /map: wyszukiwanie, filtr statusu, sortowanie, karty obciazenia, widok mapy.
- /alerts: wyszukiwanie, filtr poziomu i strefy (takze w URL), sortowanie,
  rozwijane szczegoly oraz stany pustej listy i bledu.
- Nowe widoki pobieraja oba zestawy danych przy wejsciu, po recznym odswiezeniu
  i 5 sekund po zakonczeniu poprzedniego pobrania. Zachowuja ostatni zestaw przy bledzie.
- Anulowanie zapytan po wyjsciu; stabilny identyfikator subskrypcji Echo w App.
- Responsywna nawigacja. Symulacja i ustawienia sa nieaktywne do nastepnego etapu.
- DashboardPage pozostaje bez zmian. Backend i baza pozostaja bez zmian.

## Ograniczenia danych

- Obecne dwie strefy maja coordinates=null. Mapa pokazuje brak lokalizacji.
  Obslugiwane formaty: [latitude, longitude] albo {lat, lng}, takze jako JSON string.
  Nie sa generowane fikcyjne polozenia. Mapa korzysta z kafelkow OpenStreetMap.
- Progi zgodne z backendem: ponizej 70% bezpieczna, od 70% uwaga, od 90% krytyczna.
  W przykladach PDF etykiety miejscami przecza legendzie; zastosowano legende.
- Brak alertow nie oznacza, ze wszystkie strefy sa bezpieczne: backend tworzy
  alerty przy aktualizacji liczby osob, nie przy odczycie danych startowych.
- Daty triggered_at bez strefy sa interpretowane jako UTC, zgodnie z config/app.php.
- Markery mapy pokazuja obciazenie punktow, nie geometrie obszarow ani trasy ewakuacji.

## Weryfikacja

Uruchom npm test, npm run lint i npm run build. Scenariusze przegladarki: wyszukiwanie,
filtry, przejscie strefa-alerty, puste dane, awaria i powrot API, odswiezanie,
progi 70/90%, mapa oraz widoki desktop/mobile. Dane testowe nie trafiaja do bazy.

Wynik etapu: lint, testy jednostkowe i build przeszly. Testy Playwright potwierdzily
nawigacje, oba widoki, filtry, szczegoly, obsluge awarii i powrotu API, odswiezanie
oraz jego zatrzymanie po opuszczeniu strony. Sprawdzono szerokosci 320, 390, 768
i 1440 px; obejrzano zrzuty desktop/mobile. Mape i alerty sprawdzono na
odpowiedziach testowych przechwyconych w przegladarce, a prawdziwe dane API
wykorzystano do sprawdzenia dwoch obecnych stref. Kafelki mapy wczytaly sie poprawnie.
