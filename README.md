# Leaflet + Maa- ja Ruumiameti halltoonides kaart

Lihtne staatiline kaardirakendus, mille saab avaldada GitHub Pagesis. Rakendus kasutab Leafletit, Maa- ja Ruumiameti halltoonides TMS-aluskaarti ning GeoJSON-andmekihte kataloogist `data/`.

## Failistruktuur

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    ├── layers.json
    ├── places.geojson
    └── area.geojson
```

## Kihtide lisamine ja muutmine

GitHub Pages ei paku kataloogi automaatset faililoendit. Seepärast kirjeldab `data/layers.json`, millised GeoJSON-failid laadida, mis nimega neid kaardil näidata ja kas need on alguses nähtavad.

Lisa fail `data/` kausta ja lisa `layers.json` faili `layers` massiivi uus kirje, näiteks:

```json
{
  "id": "minu-kiht",
  "name": "Minu kiht",
  "url": "./data/minu-kiht.geojson",
  "defaultVisible": true,
  "style": {
    "color": "#176b87",
    "fillColor": "#2c9abd",
    "fillOpacity": 0.25,
    "weight": 2,
    "radius": 6
  }
}
```

`defaultVisible: true` näitab kihti rakenduse avamisel; `false` jätab selle esialgu peidetuks. Rakendus saab laadida rohkem kui kaks kihti, aga näidiskonfiguratsioonis on kaks.

GeoJSON-i `properties` väljad kuvatakse objektil klõpsates hüpikaknas. Kasuta GeoJSON-i tavapärast koordinaatide järjekorda **[pikkus, laius]**. Leafleti enda koodis on keskpunkti ja piiride koordinaadid kujul `[laius, pikkus]`.

## Piiratud vaate ja suumi seadistamine

Muuda `js/app.js` alguses objekti `MAP_SETTINGS`:

- `startCenter`: kaardi algne keskpunkt.
- `startZoom`: algne suumitase.
- `minZoom` ja `maxZoom`: lubatud suumi alumine ja ülemine piir.
- `maxBounds`: lubatud kaardiala kujul `[[lõuna, lääs], [põhi, ida]]`.
- `maxBoundsViscosity: 1.0`: hoiab kasutaja kaardiala piirides.

Näidis piirab liikumise Eesti ja lähiala ümbrusesse. Piir on min-suumiga võrreldes piisavalt lai, et vaade mahuks tavalisel ekraanil mugavalt sisse. Muuda `maxBounds` enda kaardiala järgi.

## Kohalik testimine

Ära ava `index.html` otse `file://` aadressina, sest veebilehitseja võib `fetch()` päringud blokeerida. Käivita projekti juurkaustas lihtne veebiserver:

```bash
python -m http.server 8000
```

Seejärel ava `http://localhost:8000`.

## GitHub Pagesi avaldamine

1. Loo GitHubis uus repositoorium.
2. Laadi üles kõik selles kaustas olevad failid ja alamkaustad.
3. Ava repositooriumis **Settings → Pages**.
4. Vali **Deploy from a branch**, haruks `main` ja kaustaks `/(root)`, seejärel salvesta.
5. Kui GitHub Pages on avaldamise lõpetanud, näitab Settings → Pages avalikku URL-i. Jaga seda linki.

## Maa- ja Ruumiameti aluskaart ja kasutustingimused

Rakenduse näidis kasutab ametlikku halltoonides TMS-kihi nime `hallkaart@GMC` (Web Mercator / EPSG:3857) ning dokumentatsioonis toodud `KESKKOND=EXAMPLES` näidiskeskkonda. See aadress on näidisprojekti käivitamiseks, mitte garantii, et näidiskeskkond sobib avaliku rakenduse tavakasutuseks.

Maa- ja Ruumiameti TMS/WMTS/WMS-C juhend ütleb, et nende teenuste kasutamisel on nõutud proxy. **Enne laiemat avalikku kasutust** kontrolli kehtivaid kasutustingimusi ja kooskõlasta teenuse kasutamine Maa- ja Ruumiametiga; asenda `BASEMAP_URL` (`js/app.js`) sobiva proxy/teenuse aadressiga. GitHub Pages ise serveripoolset proxyt käitada ei saa — selleks vajad eraldi teenust või hostimislahendust.

Rakendus kuvab kaardil viite „Aluskaart: Maa- ja Ruumiamet (2026)”. Hoia allikaviide nähtaval ja uuenda aastat vastavalt aluskaardi andmete seisule ning ametlikule juhisele.

Ametlikud viited:

- [TMS, WMS-C ja WMTS teenused ning Leafleti näide](https://geoportaal.maaamet.ee/est/Teenused/WMS-teenused/TMS-WMS-C-ja-WMTS-teenused-p481.html)
- [Maa- ja Ruumiameti kaarditeenuste kasutustingimused](https://geoportaal.maaamet.ee/est/teenused/wms-wfs-wcs-teenused/maa-ja-ruumiameti-kaarditeenuste-kasutustingimused-p24.html)
- [Halltoonides kaardi kirjeldus](https://geoportaal.maaamet.ee/est/Ruumiandmed/Topokaardid-ja-aluskaardid/Kaart-p560.html)
