'use strict';

// --- Kaardi seadistused: muuda neid vastavalt oma rakendusele ---
const MAP_SETTINGS = {
  // Leafleti koordinaadid on kujul [laius, pikkus]. Piirang on näidisena Eesti ja lähiala ümber.
  startCenter: [59.397, 27.26],
  startZoom: 12,
  minZoom: 8,
  maxZoom: 18,
  labelMinZoom: 15,
  maxBounds: [[56.0, 19.0], [61.5, 30.0]],
  maxBoundsViscosity: 1.0,
  title: 'Minu kaart',
  description: 'Lülita paremal andmekihte sisse või välja.'
};

// Maa- ja Ruumiameti ametlik näidis-TMS EPSG:3857 ehk Leafleti vaikimisi CRS jaoks.
// Ametlik dokumentatsioon kirjeldab TMS/WMTS/WMS-C kasutamisel proxy nõuet.
// Avalikus kasutuses asenda URL kooskõlastatud/proxy aadressiga (vt README.md).
const BASEMAP_URL = 'https://tiles.maaamet.ee/tm/tms/1.0.0/hallkaart@GMC/{z}/{x}/{y}.png&ASUTUS=MAAAMET&KESKKOND=EXAMPLES';
const LAYER_MANIFEST_URL = './data/layers.json';

const statusEl = document.getElementById('app-status');
const setStatus = (message) => { statusEl.textContent = message; };

const map = L.map('map', {
  center: MAP_SETTINGS.startCenter,
  zoom: MAP_SETTINGS.startZoom,
  minZoom: MAP_SETTINGS.minZoom,
  maxZoom: MAP_SETTINGS.maxZoom,
  maxBounds: MAP_SETTINGS.maxBounds,
  maxBoundsViscosity: MAP_SETTINGS.maxBoundsViscosity,
  zoomSnap: 1,
  zoomDelta: 1,
  zoomControl: false,
  worldCopyJump: false,
  attributionControl: true
});

// Näita label'eid ainult määratud suumitasemest alates.
function updateLabelVisibility() {
  const showLabels = map.getZoom() >= MAP_SETTINGS.labelMinZoom;

  map.getContainer().classList.toggle(
    'labels-visible',
    showLabels
  );
}

map.on('zoomend', updateLabelVisibility);
updateLabelVisibility();

// Suuminupud üleval paremal
L.control.zoom({
  position: 'topright'
}).addTo(map);

L.tileLayer(BASEMAP_URL, {
  tms: true,
  minZoom: MAP_SETTINGS.minZoom,
  maxZoom: MAP_SETTINGS.maxZoom,
  attribution: 'Aluskaart: <a href="https://geoportaal.maaamet.ee/" target="_blank" rel="noopener">Maa- ja Ruumiamet</a> (2026)',
  errorTileUrl: '',
  crossOrigin: true
}).addTo(map);

// Ära luba kaardivaadet piiridest välja lohistada ka väikestel ekraanidel.
map.setMaxBounds(MAP_SETTINGS.maxBounds);
document.getElementById('app-title').textContent = MAP_SETTINGS.title;
document.getElementById('app-description').textContent = MAP_SETTINGS.description;

function makePopup(properties, layerConfig = {}) {
  const attrs = properties || {};
  const container = document.createElement('div');

  // Määra pealkirja atribuut.
  const fallbackTitleField = [
    'name', 'nimi', 'title', 'nimetus'
  ].find(key => attrs[key] !== null &&
                attrs[key] !== undefined &&
                attrs[key] !== '');

  const titleField =
    layerConfig.popupTitleField &&
    attrs[layerConfig.popupTitleField] !== null &&
    attrs[layerConfig.popupTitleField] !== undefined
      ? layerConfig.popupTitleField
      : fallbackTitleField;

  const title = document.createElement('div');
  title.className = 'popup-title';
  title.textContent = String(
    titleField ? attrs[titleField] : 'Kaardiobjekt'
  );
  container.appendChild(title);

  // Kui popupFields on määratud, kuva ainult need atribuudid.
  const fields = Array.isArray(layerConfig.popupFields)
    ? layerConfig.popupFields
    : Object.keys(attrs);

  fields.forEach(key => {
    const value = attrs[key];

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      key === titleField
    ) {
      return;
    }

    const row = document.createElement('div');
    row.className = 'popup-row';

    const label = document.createElement('strong');
   const displayName = layerConfig.popupLabels?.[key] ?? key;
label.textContent = `${displayName}: `;
    row.appendChild(label);

    const content = document.createElement('span');
    content.textContent =
      typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

    row.appendChild(content);
    container.appendChild(row);
  });

  return container;
}

function getFeatureStyle(feature, layerConfig) {
  const baseStyle = layerConfig.style || {};
  const styleBy = layerConfig.styleBy;

  // Kui klassifitseerimist pole määratud, kasuta vana stiili.
  if (!styleBy) {
    return baseStyle;
  }

  const rawValue = feature?.properties?.[styleBy.field];

  const value =
    rawValue === null ||
    rawValue === undefined ||
    rawValue === ""
      ? NaN
      : Number(rawValue);

  const selectedClass = Number.isFinite(value)
    ? styleBy.classes.find(cls =>
        (cls.min === undefined || value >= cls.min) &&
        (cls.max === undefined || value < cls.max)
      )
    : null;

  const fillColor =
    selectedClass?.color ??
    styleBy.noDataColor ??
    baseStyle.fillColor ??
    "#bdbdbd";

  return {
    ...baseStyle,
    fillColor: fillColor
  };
}

function createGeoJsonLayer(featureCollection, layerConfig) {
  const styleConfig = layerConfig.style || {};
    function getFeatureStyle(feature) {
    const style = {
      color: styleConfig.color || '#2d6f67',
      weight: Number.isFinite(styleConfig.weight)
        ? styleConfig.weight : 2,
      opacity: Number.isFinite(styleConfig.opacity)
        ? styleConfig.opacity : 0.95,
      fillColor: styleConfig.fillColor ||
        styleConfig.color || '#2d6f67',
      fillOpacity: Number.isFinite(styleConfig.fillOpacity)
        ? styleConfig.fillOpacity : 0.22,
      dashArray: styleConfig.dashArray || null
    };

    const styleBy = layerConfig.styleBy;

    // Kui kihil pole väärtuspõhist värviskaalat,
    // kasuta senist kujundust.
    if (!styleBy || !Array.isArray(styleBy.classes)) {
      return style;
    }

    const rawValue = feature?.properties?.[styleBy.field];

    const value =
      rawValue === null ||
      rawValue === undefined ||
      rawValue === ''
        ? NaN
        : Number(rawValue);

    const selectedClass = Number.isFinite(value)
      ? styleBy.classes.find(item =>
          (item.min === undefined || value >= item.min) &&
          (item.max === undefined || value < item.max)
        )
      : null;

    style.fillColor =
      selectedClass?.color ||
      styleBy.noDataColor ||
      style.fillColor;

    return style;
  }
  return L.geoJSON(featureCollection, {
    style: feature => getFeatureStyle(feature),
    pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
      radius: Number.isFinite(styleConfig.radius) ? styleConfig.radius : 6,
      color: styleConfig.color || '#2d6f67',
      weight: Number.isFinite(styleConfig.weight) ? styleConfig.weight : 2,
      opacity: Number.isFinite(styleConfig.opacity) ? styleConfig.opacity : 0.95,
      fillColor: styleConfig.fillColor || styleConfig.color || '#2d6f67',
      fillOpacity: Number.isFinite(styleConfig.fillOpacity) ? styleConfig.fillOpacity : 0.85
    }),
    onEachFeature: (feature, layer) => {
      layer.bindPopup(() =>
  makePopup(feature.properties || {}, layerConfig)
);
// Lisa kaardile label, kui kihile on määratud labelField.
const labelField = layerConfig.labelField;
const labelValue = feature.properties?.[labelField];

if (
  labelField &&
  labelValue !== null &&
  labelValue !== undefined &&
  labelValue !== ''
) {
  const label = document.createElement('span');
  label.textContent = String(labelValue);

  layer.bindTooltip(label, {
    permanent: true,
    direction: layerConfig.labelDirection || 'center',
    className: `map-feature-label ${layerConfig.labelClass || ''}`,
    opacity: 0.95
  });
}
    }
  });
}

function addLayerControl(layerItems) {
  const control = L.control({ position: 'topleft' });
  control.onAdd = () => {
    const container = L.DomUtil.create('section', 'layer-panel');
    container.setAttribute('aria-label', 'Kaardikihtide valik');
    const heading = L.DomUtil.create('h2', 'layer-panel-title', container);
    heading.textContent = 'Kuvatavad kihid';

    layerItems.forEach(({ config, layer }) => {
      const label = L.DomUtil.create('label', 'layer-option', container);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(config.defaultVisible);
      checkbox.setAttribute('aria-label', config.name || config.id);
      const swatch = L.DomUtil.create('span', 'layer-swatch', label);
      swatch.style.backgroundColor = (config.style && (config.style.fillColor || config.style.color)) || '#2d6f67';
      const text = document.createElement('span');
      text.textContent = config.name || config.id || 'Andmekiht';
      label.append(checkbox, text);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) layer.addTo(map);
        else map.removeLayer(layer);
      });
    });

    const note = L.DomUtil.create('p', 'layer-panel-note', container);
    note.textContent ="Andmed seisuga 30.09.2026";
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  control.addTo(map);
}

async function loadLayers() {
  try {
    const manifestResponse = await fetch(LAYER_MANIFEST_URL, { cache: 'no-cache' });
    if (!manifestResponse.ok) throw new Error(`Kihiregistri laadimine ebaõnnestus (${manifestResponse.status}).`);
    const manifest = await manifestResponse.json();
    if (!manifest || !Array.isArray(manifest.layers)) {
      throw new Error('Failis data/layers.json peab olema "layers" massiiv.');
    }

    document.title = manifest.title || MAP_SETTINGS.title;
    document.getElementById('app-title').textContent = manifest.title || MAP_SETTINGS.title;
    document.getElementById('app-description').textContent = manifest.description || MAP_SETTINGS.description;

    const loadedLayers = [];
    const results = await Promise.allSettled(manifest.layers.map(async (config) => {
      if (!config || !config.url || !config.id) throw new Error('Igal kihil peavad olema id ja url.');
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`${config.name || config.id}: faili laadimine ebaõnnestus (${response.status}).`);
      const geojson = await response.json();
      if (!geojson || !['FeatureCollection', 'Feature', 'GeometryCollection', 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(geojson.type)) {
        throw new Error(`${config.name || config.id}: fail ei näi olevat kehtiv GeoJSON.`);
      }
      const layer = createGeoJsonLayer(geojson, config);
      if (config.defaultVisible) layer.addTo(map);
      return { config, layer };
    }));

    const errors = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') loadedLayers.push(result.value);
      else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    });

    if (loadedLayers.length) addLayerControl(loadedLayers);
    if (errors.length) {
      console.error('Kihtide laadimise vead:', errors);
      setStatus(`${loadedLayers.length} kiht(i) laaditud. Viga: ${errors.join(' ')}`);
    } else {
      setStatus(`${loadedLayers.length} kiht(i) laaditud · Suum ${MAP_SETTINGS.minZoom}–${MAP_SETTINGS.maxZoom}`);
    }
    if (!loadedLayers.length) throw new Error('Ühtegi GeoJSON-kihti ei õnnestunud laadida. Kontrolli data/layers.json faili.');
  } catch (error) {
    console.error(error);
    setStatus(`Kaardikihtide laadimine ebaõnnestus: ${error.message}`);
  }
}


function addChoroplethLegend(layerConfig) {
  const styleBy = layerConfig.styleBy;

  if (!styleBy?.classes?.length) return;

  const legend = L.control({
    position: "bottomright"
  });

  legend.onAdd = function () {
    const div = L.DomUtil.create(
      "div",
      "choropleth-legend"
    );

    const heading = L.DomUtil.create(
      "div",
      "choropleth-legend-title",
      div
    );

    heading.textContent = layerConfig.name;

    styleBy.classes.forEach(item => {
      const row = L.DomUtil.create(
        "div",
        "choropleth-legend-row",
        div
      );

      const swatch = L.DomUtil.create(
        "span",
        "choropleth-legend-swatch",
        row
      );

      swatch.style.backgroundColor = item.color;

      const label = L.DomUtil.create("span", "", row);
      label.textContent = item.label;
    });

    return div;
  };

  legend.addTo(map);
}

loadLayers();
