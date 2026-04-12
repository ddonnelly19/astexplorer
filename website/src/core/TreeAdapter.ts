/**
 * Configurable base class for all tree traversal.
 */
type Range = [number, number];

type WalkNodeResult = {
	value: unknown;
	key: string;
	computed?: boolean;
};

type Filter = {
	key?: string;
	label?: string;
	test(value: unknown, key: string, fromArray: boolean): boolean;
};

type AdapterOptions = {
	filters?: Filter[];
	locationProps?: Set<string>;
	openByDefault(node: unknown, key: string): boolean;
	nodeToRange(node: unknown): Range | null;
	nodeToName(node: unknown): string;
	walkNode(node: unknown): Iterable<WalkNodeResult>;
	[key: string]: unknown;
};

class TreeAdapter {
	private _ranges: WeakMap<object, Range | null>;
	private _filterValues: Record<string, boolean>;
	private _adapterOptions: AdapterOptions;

	constructor(adapterOptions: AdapterOptions, filterValues: Record<string, boolean>) {
		this._ranges = new WeakMap();
		this._filterValues = filterValues;
		this._adapterOptions = adapterOptions;
	}

	/**
	 * Used by UI components to render an appropriate input for each filter.
	 */
	getConfigurableFilters(): Filter[] {
		return (this._adapterOptions.filters || []).filter(filter => Boolean(filter.key));
	}

	/**
	 * A more or less human readable name of the node.
	 */
	getNodeName(node: unknown): string {
		return this._adapterOptions.nodeToName(node);
	}

	/**
	 * The start and end indicies of the node in the source text. The return value
	 * is an array of form `[start, end]`. This is used for highlighting source
	 * text and focusing nodes in the tree.
	 */
	getRange(node: unknown): Range | null {
		if (node == null) {
			return null;
		}
		if (typeof node === 'object' && this._ranges.has(node)) {
			return this._ranges.get(node) || null;
		}
		const { nodeToRange } = this._adapterOptions;
		const range = nodeToRange(node);
		if (node && typeof node === 'object') {
			this._ranges.set(node, range);
		}
		return range;
	}

	isInRange(node: unknown, key: string, position: number): boolean {
		if (this.isLocationProp(key)) {
			return false;
		}
		if (!isValidPosition(position)) {
			return false;
		}
		const range = this.getRange(node);
		if (!range) {
			return false;
		}
		return range[0] <= position && position <= range[1];
	}

	hasChildrenInRange(node: unknown, key: string, position: number, seen = new Set<unknown>()): boolean {
		if (this.isLocationProp(key)) {
			return false;
		}
		if (!isValidPosition(position)) {
			return false;
		}
		seen.add(node);
		const range = this.getRange(node);
		if (range && !this.isInRange(node, key, position)) {
			return false;
		}
		// Not everything that is rendered has location associated with it (most
		// commonly arrays). In such a case we are a looking whether the node
		// contains any other nodes with location data (recursively).
		for (const { value: child, key } of this.walkNode(node)) {
			if (this.isInRange(child, key, position)) {
				return true;
			}
		}
		for (const { value: child, key } of this.walkNode(node)) {
			if (seen.has(child)) {
				continue;
			}
			if (this.hasChildrenInRange(child, key, position, seen)) {
				return true;
			}
		}
		return false;
	}

	isLocationProp(key: string): boolean {
		return Boolean(this._adapterOptions.locationProps && this._adapterOptions.locationProps.has(key));
	}

	/**
	 * Whether or not the provided node should be automatically expanded.
	 */
	opensByDefault(node: unknown, key: string): boolean {
		return this._adapterOptions.openByDefault(node, key);
	}

	isArray(node: unknown): boolean {
		return Array.isArray(node);
	}

	isObject(node: unknown): boolean {
		return Boolean(node) && typeof node === 'object' && !this.isArray(node);
	}

	/**
	 * A generator to iterate over each "property" of the node.
	 */
	*walkNode(node: unknown): Generator<WalkNodeResult> {
		if (node != null) {
			for (const result of this._adapterOptions.walkNode(node)) {
				if (
					(this._adapterOptions.filters || []).some(filter => {
						if (filter.key && !this._filterValues[filter.key]) {
							return false;
						}
						return filter.test(result.value, result.key, Array.isArray(node));
					})
				) {
					continue;
				}
				yield result;
			}
		}
	}

}

const TreeAdapterConfigs: Record<string, Partial<AdapterOptions> & Record<string, unknown>> = {
	default: {
		filters: [],
		openByDefault: () => false,
		nodeToRange: () => null,
		nodeToName: () => { throw new Error('nodeToName must be passed'); },
		walkNode: () => { throw new Error('walkNode must be passed'); },
	},

	estree: {
		filters: [
			functionFilter(),
			emptyKeysFilter(),
			locationInformationFilter(new Set(['range', 'loc', 'start', 'end'])),
			typeKeysFilter(),
		],
		openByDefaultNodes: new Set(['Program']),
		openByDefaultKeys: new Set([
			'body',
			'elements', // array literals
			'declarations', // variable declaration
			'expression', // expression statements
		]),
		openByDefault(node, key) {
			const typedNode = node as { type?: string } | null;
			const config = this as { openByDefaultNodes: Set<string>; openByDefaultKeys: Set<string> };
			return Boolean(typedNode && typedNode.type && config.openByDefaultNodes.has(typedNode.type)) ||
				config.openByDefaultKeys.has(key);
		},
		nodeToRange(node) {
			if (!(node && typeof node === 'object')) {
				return null;
			}
			const typedNode = node as { range?: unknown; start?: unknown; end?: unknown };
			if (Array.isArray(typedNode.range) && typedNode.range.length >= 2) {
				return [typedNode.range[0] as number, typedNode.range[1] as number];
			}
			if (typeof typedNode.start === 'number' && typeof typedNode.end === 'number') {
				return [typedNode.start, typedNode.end];
			}
			return null;
		},
		nodeToName(node) {
			return (node as { type?: string }).type || 'Object';
		},
		*walkNode(node) {
			if (node && typeof node === 'object') {
				const objectNode = node as Record<string, unknown>;
				for (const prop in objectNode) {
					yield {
						value: objectNode[prop],
						key: prop,
						computed: false,
					}
				}
			}
		},
	},
};

function isValidPosition(position: number): boolean {
	return Number.isInteger(position);
}

export function ignoreKeysFilter(keys = new Set<string>(), key?: string, label?: string): Filter {
	return {
		key,
		label,
		test(_value, nodeKey) { return keys.has(nodeKey); },
	};
}

export function locationInformationFilter(keys: Set<string>): Filter {
	return ignoreKeysFilter(
		keys,
		'hideLocationData',
		'Hide location data',
	);
}

export function functionFilter(): Filter {
	return {
		key: 'hideFunctions',
		label: 'Hide methods',
		test(value) { return typeof value === 'function'; },
	};
}

export function emptyKeysFilter(): Filter {
	return {
		key: 'hideEmptyKeys',
		label: 'Hide empty keys',
		test(value, key, fromArray) { return value == null && !fromArray; },
	};
}

export function typeKeysFilter(keys = new Set<string>()): Filter {
	return ignoreKeysFilter(
		keys,
		'hideTypeKeys',
		'Hide type keys',
	);
}

function createTreeAdapter(type: string, adapterOptions: Partial<AdapterOptions> = {}, filterValues: Record<string, boolean>) {
	if (TreeAdapterConfigs[type] == null) {
		throw new Error(`Unknown tree adapter type "${type}"`);
	}
	const mergedOptions = Object.assign({}, TreeAdapterConfigs[type], adapterOptions) as AdapterOptions;
	return new TreeAdapter(
		mergedOptions,
		filterValues,
	);
}

export function treeAdapterFromParseResult({ treeAdapter }: { treeAdapter: { type: string; options?: Partial<AdapterOptions> } }, filterValues: Record<string, boolean>) {
	return createTreeAdapter(
		treeAdapter.type,
		treeAdapter.options,
		filterValues,
	);
}
