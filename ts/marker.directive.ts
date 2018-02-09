import {
    AfterContentInit,
    Directive,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
} from '@angular/core';
import {
    DivIcon,
    DragEndEvent,
    Handler,
    Icon,
    LatLng,
    LatLngLiteral,
    LatLngTuple,
    LeafletEvent,
    Map,
    Marker,
    PopupEvent,
    TooltipEvent,
} from 'leaflet';
import { LayerGroupProvider } from './layer-group.provider';
import { LayerProvider } from './layer.provider';
import { MarkerProvider } from './marker.provider';

@Directive({
    providers: [ LayerProvider, MarkerProvider ],
    selector: 'yaga-marker',
})
export class MarkerDirective extends Marker implements AfterContentInit, OnDestroy {
    @Output() public positionChange: EventEmitter<LatLng> = new EventEmitter();
    @Output() public latChange: EventEmitter<number> = new EventEmitter();
    @Output() public lngChange: EventEmitter<number> = new EventEmitter();
    @Output() public opacityChange: EventEmitter<number> = new EventEmitter();
    @Output() public displayChange: EventEmitter<boolean> = new EventEmitter();
    @Output() public zIndexOffsetChange: EventEmitter<number> = new EventEmitter();
    @Output() public draggableChange: EventEmitter<boolean> = new EventEmitter();
    @Output() public iconChange: EventEmitter<Icon | DivIcon> = new EventEmitter();
    @Output() public tooltipOpenedChange: EventEmitter<boolean> = new EventEmitter();
    @Output() public popupOpenedChange: EventEmitter<boolean> = new EventEmitter();

    @Output('dragend') public dragendEvent: EventEmitter<DragEndEvent> = new EventEmitter();
    @Output('dragstart') public dragstartEvent: EventEmitter<LeafletEvent> = new EventEmitter();
    @Output('movestart') public movestartEvent: EventEmitter<LeafletEvent> = new EventEmitter();
    @Output('drag') public dragEvent: EventEmitter<LeafletEvent> = new EventEmitter();
    @Output('moveend') public moveendEvent: EventEmitter<LeafletEvent> = new EventEmitter();

    @Output('add') public addEvent: EventEmitter<LeafletEvent> = new EventEmitter();
    @Output('remove') public removeEvent: EventEmitter<LeafletEvent> = new EventEmitter();
    @Output('popupopen') public popupopenEvent: EventEmitter<PopupEvent> = new EventEmitter();
    @Output('popupclose') public popupcloseEvent: EventEmitter<PopupEvent> = new EventEmitter();
    @Output('tooltipopen') public tooltipopenEvent: EventEmitter<TooltipEvent> = new EventEmitter();
    @Output('tooltipclose') public tooltipcloseEvent: EventEmitter<TooltipEvent> = new EventEmitter();
    @Output('click') public clickEvent: EventEmitter<MouseEvent> = new EventEmitter();
    @Output('dbclick') public dbclickEvent: EventEmitter<MouseEvent> = new EventEmitter();
    @Output('mousedown') public mousedownEvent: EventEmitter<MouseEvent> = new EventEmitter();
    @Output('mouseover') public mouseoverEvent: EventEmitter<MouseEvent> = new EventEmitter();
    @Output('mouseout') public mouseoutEvent: EventEmitter<MouseEvent> = new EventEmitter();
    @Output('contextmenu') public contextmenuEvent: EventEmitter<MouseEvent> = new EventEmitter();

    private initialized: boolean = false;

    constructor(
        layerGroupProvider: LayerGroupProvider,
        layerProvider: LayerProvider,
        markerProvider: MarkerProvider,
    ) {
        super([0, 0]);
        layerProvider.ref = this;
        markerProvider.ref = this;
        layerGroupProvider.ref.addLayer(this);

        this.on('remove', () => {
            this.displayChange.emit(false);
        });
        this.on('add', () => {
            this.displayChange.emit(true);
        });
        this.on('drag', (event: DragEndEvent) => {
            this.latChange.emit(this.getLatLng().lat);
            this.lngChange.emit(this.getLatLng().lng);
            this.positionChange.emit(this.getLatLng());
        });

        // Events
        this.on('dragend', (event: DragEndEvent) => {
            this.dragendEvent.emit(event);
        });
        this.on('dragstart', (event: LeafletEvent) => {
            this.dragstartEvent.emit(event);
        });
        this.on('movestart', (event: LeafletEvent) => {
            this.movestartEvent.emit(event);
        });
        this.on('drag', (event: LeafletEvent) => {
            this.dragEvent.emit(event);
        });
        this.on('moveend', (event: LeafletEvent) => {
            this.moveendEvent.emit(event);
        });
        this.on('add', (event: LeafletEvent) => {
            this.addEvent.emit(event);
        });
        this.on('remove', (event: LeafletEvent) => {
            this.removeEvent.emit(event);
        });
        this.on('popupopen', (event: PopupEvent) => {
            this.popupopenEvent.emit(event);
        });
        this.on('popupclose', (event: PopupEvent) => {
            this.popupcloseEvent.emit(event);
        });
        this.on('tooltipopen', (event: TooltipEvent) => {
            this.tooltipopenEvent.emit(event);
        });
        this.on('tooltipclose', (event: TooltipEvent) => {
            this.tooltipcloseEvent.emit(event);
        });
        this.on('click', (event: MouseEvent) => {
            this.clickEvent.emit(event);
        });
        this.on('dbclick', (event: MouseEvent) => {
            this.dbclickEvent.emit(event);
        });
        this.on('mousedown', (event: MouseEvent) => {
            this.mousedownEvent.emit(event);
        });
        this.on('mouseover', (event: MouseEvent) => {
            this.mouseoverEvent.emit(event);
        });
        this.on('mouseout', (event: MouseEvent) => {
            this.mouseoutEvent.emit(event);
        });
        this.on('contextmenu', (event: MouseEvent) => {
            this.contextmenuEvent.emit(event);
        });
        const oldDraggingEnable: () => any = this.dragging.enable;
        const oldDraggingDisable: () => any = this.dragging.disable;

        this.dragging.enable = (): Handler => {
            const val: Handler = oldDraggingEnable.call(this.dragging);
            this.draggableChange.emit(true);
            return val;
        };
        this.dragging.disable = (): Handler => {
            const val: Handler = oldDraggingDisable.call(this.dragging);
            this.draggableChange.emit(false);
            return val;
        };
    }

    public ngAfterContentInit(): void {
        this.initialized = true; // Otherwise lng gets overwritten to 0
    }

    public ngOnDestroy(): void {
        this.removeFrom((this as any)._map);
    }

    @Input() public set display(val: boolean) {
        const isDisplayed: boolean = this.display;
        if (isDisplayed === val) {
            return;
        }
        let pane: HTMLElement;
        let container: HTMLElement;
        let map: Map;
        let events: any; // Dictionary of functions
        let eventKeys: string[];
        try {
            pane = this.getPane();
            container = this.getElement();
            map = (this as any)._map;
            events = this.getEvents();
            eventKeys = Object.keys(events);
        } catch (err) {
            /* istanbul ignore next */
            return;
        }
        if (val) {
            // show layer
            pane.appendChild(container);
            for (const eventKey of eventKeys) {
                map.on(eventKey, events[eventKey], this);
            }
        } else {
            // hide layer
            pane.removeChild(container);
            for (const eventKey of eventKeys) {
                map.off(eventKey, events[eventKey], this);
            }
        }
    }
    public get display(): boolean {
        let pane: HTMLElement;
        let container: HTMLElement;
        try {
            pane = this.getPane();
            container = this.getElement();
        } catch (err) {
            /* istanbul ignore next */
            return false;
        }
        /* tslint:disable:prefer-for-of */
        for (let i: number = 0; i < pane.children.length; i += 1) {
            /* tslint:enable */
            /* istanbul ignore else */
            if (pane.children[i] === container) {
                return true;
            }
        }
        return false;
    }

    public setLatLng(val: LatLng | LatLngLiteral | LatLngTuple): this {
        super.setLatLng((val as any));
        if (this.initialized) {
            this.positionChange.emit(this.getLatLng());
            this.latChange.emit(this.getLatLng().lat);
            this.lngChange.emit(this.getLatLng().lng);
        }
        return this;
    }
    @Input() public set position(val: LatLng) {
        this.setLatLng(val);
    }
    public get position(): LatLng {
        return this.getLatLng();
    }

    @Input() public set lat(val: number) {
        this.setLatLng([val, this.lng]);
    }
    public get lat(): number {
        return this.getLatLng().lat;
    }
    @Input() public set lng(val: number) {
        this.setLatLng([this.lat, val]);
    }
    public get lng(): number {
        return this.getLatLng().lng;
    }

    public setOpacity(val: number): this {
        if (this.opacity === val) {
            return this;
        }
        this.opacityChange.emit(val);
        return super.setOpacity(val);
    }
    @Input() public set opacity(val: number) {
        this.setOpacity(val);
    }
    public get opacity(): number {
        return this.options.opacity;
    }

    public setIcon(val: Icon | DivIcon): this {
        super.setIcon(val);
        this.iconChange.emit(val);
        return this;
    }
    @Input() public set icon(val: Icon | DivIcon) {
        this.setIcon(val);
    }
    public get icon(): Icon | DivIcon {
        return this.options.icon;
    }
    @Input() public set draggable(val: boolean) {
        if (val) {
            this.dragging.enable();
            return;
        }
        this.dragging.disable();
        return;
    }
    public get draggable(): boolean {
        return this.dragging.enabled();
    }
    public setZIndexOffset(val: number): this {
        if (this.zIndexOffset === val) {
            return this;
        }
        this.zIndexOffsetChange.emit(val);
        return super.setZIndexOffset(val);
    }
    @Input() public set zIndexOffset(val: number) {
        this.setZIndexOffset(val);
    }
    public get zIndexOffset(): number {
        return this.options.zIndexOffset;
    }

    @Input() public set title(val: string) {
        this.options.title = val;
        this.getElement().setAttribute('title', val);
    }
    public get title(): string {
        return this.getElement().getAttribute('title');
    }
    @Input() public set alt(val: string) {
        this.options.alt = val;
        this.getElement().setAttribute('alt', val);
    }
    public get alt(): string {
        return this.getElement().getAttribute('alt');
    }
}
