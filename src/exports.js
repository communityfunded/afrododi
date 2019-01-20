/* @flow */
import {hashString} from './util';
import {
    injectAndGetClassName,
    startBuffering,
    flushToString,
    flushToStyleTag,
    addRenderedClassNames,
    getRenderedClassNames,
    getBufferedStyles,
} from './inject';
import {defaultSelectorHandlers} from './generate';

/* ::
import type { SelectorHandler } from './generate.js';
import type { StyleContext } from './inject.js';
export type SheetDefinition = { [id:string]: any };
export type SheetDefinitions = SheetDefinition | SheetDefinition[];
type RenderFunction = (context: StyleContext) => string;
type AsyncRenderFunction = (context: StyleContext) => Promise<string>;
type Extension = {
    selectorHandler: SelectorHandler
};
export type MaybeSheetDefinition = SheetDefinition | false | null | void
*/

const unminifiedHashFn = (str/* : string */, key/* : string */) => `${key}_${hashString(str)}`;

// StyleSheet.create is in a hot path so we want to keep as much logic out of it
// as possible. So, we figure out which hash function to use once, and only
// switch it out via minify() as necessary.
//
// This is in an exported function to make it easier to test.
export const initialHashFn = () => process.env.NODE_ENV === 'production'
    ? hashString
    : unminifiedHashFn;

let hashFn = initialHashFn();

const StyleSheet = {
    create(sheetDefinition /* : SheetDefinition */) /* : Object */ {
        const mappedSheetDefinition = {};
        const keys = Object.keys(sheetDefinition);

        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            const val = sheetDefinition[key];
            const stringVal = JSON.stringify(val);

            mappedSheetDefinition[key] = {
                _len: stringVal.length,
                _name: hashFn(stringVal, key),
                _definition: val,
            };
        }

        return mappedSheetDefinition;
    },

    rehydrate(context /* : StyleContext */, renderedClassNames /* : string[] */ =[]) {
        addRenderedClassNames(context, renderedClassNames);
    },
};

/**
 * Utilities for using afrododi server-side.
 *
 * This can be minified out in client-only bundles by replacing `typeof window`
 * with `"object"`, e.g. via Webpack's DefinePlugin:
 *
 *   new webpack.DefinePlugin({
 *     "typeof window": JSON.stringify("object")
 *   })
 */
const StyleSheetServer = typeof window !== 'undefined'
    ? null
    : {
        renderStatic(renderFunc /* : RenderFunction */) {
            const context = startBuffering();
            const html = renderFunc(context);
            const cssContent = flushToString(context);

            return {
                html: html,
                css: {
                    content: cssContent,
                    renderedClassNames: getRenderedClassNames(context),
                },
            };
        },
        renderStaticAsync(renderFunc /* : AsyncRenderFunction */) {
            const context = startBuffering();

            return renderFunc(context).then((html /* : string */) => {
                const cssContent = flushToString(context);

                return {
                    html: html,
                    css: {
                        content: cssContent,
                        renderedClassNames: getRenderedClassNames(context),
                    },
                };
            })
        },
    };

/**
 * Utilities for using afrododi in tests.
 *
 * Not meant to be used in production.
 */
const StyleSheetTestUtils = process.env.NODE_ENV === 'production'
    ? null
    : {
        /**
         * Gets a new StyleContext instance to use during testing
         *
         * @returns {object}  StyleContext instance for use during testing
         */
        getContext() /* : StyleContext */ {
            return startBuffering();
        },

        /**
         * Returns a string of buffered styles which have not been flushed
         *
         * @returns {string}  Buffer of styles which have not yet been flushed.
         */
        getBufferedStyles(context /* : StyleContext */) /* : string[] */ {
            return getBufferedStyles(context);
        }
    };

/**
 * Generate the afrododi API exports, with given `selectorHandlers` and
 * `useImportant` state.
 */
export default function makeExports(
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */ = defaultSelectorHandlers,
) {
    return {
        StyleSheet: {
            ...StyleSheet,

            /**
             * Returns a version of the exports of afrododi (i.e. an object
             * with `css` and `StyleSheet` properties) which have some
             * extensions included.
             *
             * @param {Array.<Object>} extensions: An array of extensions to
             *     add to this instance of afrododi. Each object should have a
             *     single property on it, defining which kind of extension to
             *     add.
             * @param {SelectorHandler} [extensions[].selectorHandler]: A
             *     selector handler extension. See `defaultSelectorHandlers` in
             *     generate.js.
             *
             * @returns {Object} An object containing the exports of the new
             *     instance of afrododi.
             */
            extend(extensions /* : Extension[] */) {
                const extensionSelectorHandlers = extensions
                    // Pull out extensions with a selectorHandler property
                    .map(extension => extension.selectorHandler)
                    // Remove nulls (i.e. extensions without a selectorHandler property).
                    .filter(handler => handler);

                return makeExports(
                    useImportant,
                    selectorHandlers.concat(extensionSelectorHandlers)
                );
            },
        },

        StyleSheetServer,
        StyleSheetTestUtils,

        minify(shouldMinify /* : boolean */) {
            hashFn = shouldMinify ? hashString : unminifiedHashFn;
        },

        css(context /* : StyleContext */, ...styleDefinitions /* : MaybeSheetDefinition[] */) {
            return injectAndGetClassName(
                context, useImportant, styleDefinitions, selectorHandlers);
        },

        flushToStyleTag,
        injectAndGetClassName,
        defaultSelectorHandlers,
    };
}
