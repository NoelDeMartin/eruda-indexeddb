import eruda from 'eruda';
import LunaDataGrid from 'luna-data-grid';
import each from 'licia/each';
import type { DevTools } from 'eruda';
import { type $, evalCss } from 'licia';
import { deleteDB, openDB } from 'idb';
import { classPrefix as c } from './utils';

export type LiciaElement = $.$;

export interface IndexedDBItem {
    database: string;
    store: string;
    objects: string;
}

export default class ErudaIndexedDB extends eruda.Tool {

    private dataGrid: LunaDataGrid | null = null;
    private items: IndexedDBItem[] = [];
    private devTools: DevTools | null = null;
    private selectedItem: IndexedDBItem | null = null;
    private supported = true;
    private $el: LiciaElement | null = null;
    private $dataGrid: LiciaElement | null = null;

    constructor() {
        super();

        this.name = 'IndexedDB';
    }

    public init(_$el: unknown): void {
        super.init(_$el);
        this.initTemplate(_$el as LiciaElement);

        // eslint-disable-next-line prefer-rest-params
        this.devTools = arguments[1] as DevTools;
        this.$el = _$el as LiciaElement;
        this.$dataGrid = this.$el.find(c('.data-grid'));
        this.dataGrid = new LunaDataGrid(this.$dataGrid.get(0) as HTMLElement, {
            columns: [
                {
                    id: 'database',
                    title: 'Database',
                    weight: 30,
                },
                {
                    id: 'store',
                    title: 'Store',
                    weight: 60,
                },
                {
                    id: 'objects',
                    title: 'Objects',
                    weight: 20,
                },
            ],
            minHeight: 60,
            maxHeight: 223,
        });

        this.bindEvents();
    }

    public destroy(): void {
        super.destroy();
    }

    public show(): this {
        super.show();
        this.refresh();

        return this;
    }

    private async refresh(): Promise<void> {
        if (!this.supported) {
            this.$el?.hide();

            return;
        }

        await this.refreshData();

        this.dataGrid?.clear();

        each(this.items, ({ database, store, objects }) => {
            this.dataGrid?.append(
                {
                    database,
                    store,
                    objects,
                },
                {
                    selectable: true,
                },
            );
        });
    }

    private initTemplate($el: LiciaElement): void {
        $el.html(
            c(`<div class="actions" style="display:flex;gap:4px;margin:10px">
              <h2>IndexedDB</h2>
              <span style="flex:1"></span>
              <div class="btn refresh-databases">
                <span class="icon icon-refresh"></span>
              </div>
              <div class="btn show-detail btn-disabled">
                <span class="icon icon-eye"></span>
              </div>
              <div class="btn clear-database">
                <span class="icon icon-clear"></span>
              </div>
            </div>
            <div class="data-grid" style="margin:10px"></div>`),
        );
    }

    private bindEvents() {
        this.$el
            ?.on('click', c('.refresh-databases'), () => {
                this.devTools?.notify('Refreshed', { icon: 'success' });

                this.refresh();
            })
            .on('click', c('.clear-database'), async () => {
                if (
                    !this.selectedItem ||
                    !confirm(`Are you sure that you want to delete the '${this.selectedItem.database}' database?`)
                ) {
                    return;
                }

                await deleteDB(this.selectedItem.database);

                this.refresh();
            })
            .on('click', c('.show-detail'), async () => {
                if (!this.selectedItem) {
                    return;
                }

                const { database, store } = this.selectedItem;
                const val = await this.getValue(database, store);

                try {
                    this.showSources('object', JSON.parse(JSON.stringify(val)));
                } catch {
                    this.showSources('raw', val);
                }
            });

        this.dataGrid
            ?.on('select', (node) => {
                this.selectedItem = {
                    database: node.data.database,
                    store: node.data.store,
                    objects: node.data.objects,
                };
                this.updateButtons();
            })
            .on('deselect', () => {
                this.selectedItem = null;
                this.updateButtons();
            });
    }

    private showSources(type: string, data: unknown) {
        const sources = this.devTools?.get('sources') as unknown as { set: (type: string, data: unknown) => void };

        if (!sources) {
            return;
        }

        sources.set(type, data);

        this.devTools?.showTool('sources');

        return true;
    }

    private async getValue(database: string, store: string) {
        const db = await openDB(database);
        const objects = await db.getAll(store);

        db.close();

        return objects;
    }

    private updateButtons() {
        const $showDetail = this.$el?.find(c('.show-detail'));
        const btnDisabled = c('btn-disabled');

        if (!$showDetail) {
            return;
        }

        $showDetail.addClass(btnDisabled);

        if (this.selectedItem) {
            $showDetail.rmClass(btnDisabled);
        }
    }

    private async refreshData() {
        try {
            const databases = await indexedDB.databases();
            const values = await Promise.all(
                databases.map(async (database) => {
                    if (!database.name) {
                        return;
                    }

                    const db = await openDB(database.name);
                    const databaseValues = await Promise.all(
                        Array.from(db.objectStoreNames).map(async (store) => {
                            return {
                                database: database.name,
                                store,
                                objects: String(await db.count(store)),
                            };
                        }),
                    );

                    db.close();

                    return databaseValues;
                }),
            );

            this.items = values.flat().filter(Boolean) as IndexedDBItem[];
        } catch {
            this.supported = false;

            this.$el?.hide();
        }
    }

}
