// Client-only: patches Leaflet once, before any map is created.
import L from "leaflet";

/**
 * Leaflet 1.9.4 bug: binding a tooltip adds a "focus" listener to the marker's
 * element that does `this._tooltip._source = …`, but unbinding the tooltip never
 * removes that listener. When a tooltip is removed while its marker stays (e.g.
 * pin tooltips are hidden while an admin draws), focusing or clicking that
 * marker throws "Cannot set properties of null (setting '_source')".
 * This replaces the listener with one that checks the tooltip still exists.
 */
type TooltipHost = L.Layer & { _tooltip?: L.Tooltip & { _source?: L.Layer } };

const proto = L.Layer.prototype as unknown as {
  _addFocusListenersOnLayer?: (layer: L.Layer & { getElement?: () => HTMLElement | undefined }) => void;
  __muPatched?: boolean;
};

if (!proto.__muPatched && typeof proto._addFocusListenersOnLayer === "function") {
  proto.__muPatched = true;
  proto._addFocusListenersOnLayer = function (this: TooltipHost, layer) {
    const el = typeof layer.getElement === "function" ? layer.getElement() : undefined;
    if (!el) return;
    L.DomEvent.on(
      el,
      "focus",
      function (this: TooltipHost) {
        if (!this._tooltip) return;
        this._tooltip._source = layer;
        this.openTooltip();
      },
      this,
    );
    L.DomEvent.on(el, "blur", this.closeTooltip, this);
  };
}
