/* @flow */
import asap from 'asap';

import OrderedElements from './ordered-elements';
import {generateCSS} from './generate';
import {hashObject, hashString} from './util';

/* ::
import type { SheetDefinition, SheetDefinitions } from './index.js';
import type { MaybeSheetDefinition } from './exports.js';
import type { SelectorHandler } from './generate.js';

export type StyleContext = {
    styleTag?: HTMLStyleElement,
    alreadyInjected: { [string]: boolean },
    injectionBuffer: string[],
    isBuffering: boolean,
};
*/

export const createContext = () /* : StyleContext */ => ({
    // The current <style> tag we are inserting into, or null if we haven't
    // inserted anything yet. We could find this each time using
    // `document.querySelector("style[data-afrododi"])`, but holding onto it is
    // faster.
    styleTag: undefined,

    // This is a map from afrododi's generated class names to `true` (acting as a
    // set of class names)
    alreadyInjected: {},

    // This is the buffer of styles which have not yet been flushed.
    injectionBuffer: [],

    // A flag to tell if we are already buffering styles. This could happen either
    // because we scheduled a flush call already, so newly added styles will
    // already be flushed, or because we are statically buffering on the server.
    isBuffering: false,
})

// Inject a set of rules into a <style> tag in the head of the document. This
// will automatically create a style tag and then continue to use it for
// multiple injections. It will also use a style tag with the `data-afrododi`
// tag on it if that exists in the DOM. This could be used for e.g. reusing the
// same style tag that server-side rendering inserts.
const injectStyleTag = (context /* : StyleContext */, cssRules /* : string[] */) => {
    if (context.styleTag == null) {
        // Try to find a style tag with the `data-afrododi` attribute first.
        context.styleTag = ((document.querySelector("style[data-afrododi]") /* : any */) /* : HTMLStyleElement | void */);

        // If that doesn't work, generate a new style tag.
        if (context.styleTag == null) {
            // Taken from
            // http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript
            const head = document.head || document.getElementsByTagName('head')[0];
            context.styleTag = document.createElement('style');

            context.styleTag.type = 'text/css';
            context.styleTag.setAttribute("data-afrododi", "");
            if (context.styleTag) head.appendChild(context.styleTag);
        }
    }

    // $FlowFixMe
    const sheet = ((context.styleTag.styleSheet || context.styleTag.sheet /* : any */) /* : CSSStyleSheet */);

    if (sheet.insertRule) {
        let numRules = sheet.cssRules.length;
        cssRules.forEach((rule) => {
            try {
                sheet.insertRule(rule, numRules);
                numRules += 1;
            } catch(e) {
                // The selector for this rule wasn't compatible with the browser
            }
        });
    } else if (context.styleTag) {
        // $FlowFixMe
        context.styleTag.innerText = (context.styleTag.innerText || '') + cssRules.join('');
    }
};

// Custom handlers for stringifying CSS values that have side effects
// (such as fontFamily, which can cause @font-face rules to be injected)
const stringHandlers = {
    // With fontFamily we look for objects that are passed in and interpret
    // them as @font-face rules that we need to inject. The value of fontFamily
    // can either be a string (as normal), an object (a single font face), or
    // an array of objects and strings.
    fontFamily: function fontFamily(context /* : StyleContext */, val) {
        if (Array.isArray(val)) {
            const nameMap = {};

            val.forEach(v => {
                nameMap[fontFamily(v)] = true;
            });

            return Object.keys(nameMap).join(",");
        } else if (typeof val === "object") {
            injectStyleOnce(context, val.src, "@font-face", [val], false);
            return `"${val.fontFamily}"`;
        } else {
            return val;
        }
    },

    // With animationName we look for an object that contains keyframes and
    // inject them as an `@keyframes` block, returning a uniquely generated
    // name. The keyframes object should look like
    //  animationName: {
    //    from: {
    //      left: 0,
    //      top: 0,
    //    },
    //    '50%': {
    //      left: 15,
    //      top: 5,
    //    },
    //    to: {
    //      left: 20,
    //      top: 20,
    //    }
    //  }
    // TODO(emily): `stringHandlers` doesn't let us rename the key, so I have
    // to use `animationName` here. Improve that so we can call this
    // `animation` instead of `animationName`.
    animationName: function animationName(context /* : StyleContext */, val, selectorHandlers) {
        if (Array.isArray(val)) {
            return val.map(v => animationName(v, selectorHandlers)).join(",");
        } else if (typeof val === "object") {
            // Generate a unique name based on the hash of the object. We can't
            // just use the hash because the name can't start with a number.
            // TODO(emily): this probably makes debugging hard, allow a custom
            // name?
            const name = `keyframe_${hashObject(val)}`;

            // Since keyframes need 3 layers of nesting, we use `generateCSS` to
            // build the inner layers and wrap it in `@keyframes` ourselves.
            let finalVal = `@keyframes ${name}{`;

            // TODO see if we can find a way where checking for OrderedElements
            // here is not necessary. Alternatively, perhaps we should have a
            // utility method that can iterate over either a plain object, an
            // instance of OrderedElements, or a Map, and then use that here and
            // elsewhere.
            if (val instanceof OrderedElements) {
                val.forEach((valVal, valKey) => {
                    finalVal += generateCSS(
                        valKey, [valVal], selectorHandlers, stringHandlers, false).join('');
                });
            } else {
                Object.keys(val).forEach(key => {
                    finalVal += generateCSS(
                        key, [val[key]], selectorHandlers, stringHandlers, false).join('');
                });
            }
            finalVal += '}';

            injectGeneratedCSSOnce(context, name, [finalVal]);

            return name;
        } else {
            return val;
        }
    },
};

const injectGeneratedCSSOnce = (context /* : StyleContext */, key, generatedCSS) => {
    if (context.alreadyInjected[key]) {
        return;
    }

    if (!context.isBuffering) {
        // We should never be automatically buffering on the server (or any
        // place without a document), so guard against that.
        if (typeof document === "undefined") {
            throw new Error(
                "Cannot automatically buffer without a document");
        }

        // If we're not already buffering, schedule a call to flush the
        // current styles.
        context.isBuffering = true;
        asap(() => flushToStyleTag(context));
    }

    context.injectionBuffer.push(...generatedCSS);
    context.alreadyInjected[key] = true;
}

export const injectStyleOnce = (
    context /* : StyleContext */,
    key /* : string */,
    selector /* : string */,
    definitions /* : SheetDefinition[] */,
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */ = []
) => {
    if (context.alreadyInjected[key]) {
        return;
    }

    const generated = generateCSS(
        selector, definitions, selectorHandlers,
        stringHandlers, useImportant);

    injectGeneratedCSSOnce(context, key, generated);
};

export const getBufferedStyles = (context /* : StyleContext */) => {
    return context.injectionBuffer;
}

export const startBuffering = () /* : StyleContext */ => {
    const context = createContext();
    context.isBuffering = true;

    return context
};

const flushToArray = (context /* : StyleContext */) => {
    context.isBuffering = false;
    const ret = context.injectionBuffer;
    context.injectionBuffer = [];
    return ret;
};

export const flushToString = (context /* : StyleContext */) => {
    return flushToArray(context).join('');
};

export const flushToStyleTag = (context /* : StyleContext */) => {
    const cssRules = flushToArray(context);
    if (cssRules.length > 0) {
        injectStyleTag(context, cssRules);
    }
};

export const getRenderedClassNames = (context /* : StyleContext */) /* : string[] */ => {
    return Object.keys(context.alreadyInjected);
};

export const addRenderedClassNames = (context /* : StyleContext */, classNames /* : string[] */) => {
    classNames.forEach(className => {
        context.alreadyInjected[className] = true;
    });
};

const processStyleDefinitions = (
    styleDefinitions /* : any[] */,
    classNameBits /* : string[] */,
    definitionBits /* : Object[] */,
    length /* : number */,
) /* : number */ => {
    for (let i = 0; i < styleDefinitions.length; i += 1) {
        // Filter out falsy values from the input, to allow for
        // `css(a, test && c)`
        if (styleDefinitions[i]) {
            if (Array.isArray(styleDefinitions[i])) {
                // We've encountered an array, so let's recurse
                length += processStyleDefinitions(
                    styleDefinitions[i],
                    classNameBits,
                    definitionBits,
                    length,
                );
            } else {
                classNameBits.push(styleDefinitions[i]._name);
                definitionBits.push(styleDefinitions[i]._definition);
                length += styleDefinitions[i]._len;
            }
        }
    }
    return length;
};

/**
 * Inject styles associated with the passed style definition objects, and return
 * an associated CSS class name.
 *
 * @param {boolean} useImportant If true, will append !important to generated
 *     CSS output. e.g. {color: red} -> "color: red !important".
 * @param {(Object|Object[])[]} styleDefinitions style definition objects, or
 *     arbitrarily nested arrays of them, as returned as properties of the
 *     return value of StyleSheet.create().
 */
export const injectAndGetClassName = (
    context /* : StyleContext */,
    useImportant /* : boolean */,
    styleDefinitions /* : MaybeSheetDefinition[] */,
    selectorHandlers /* : SelectorHandler[] */
) /* : string */ => {
    const classNameBits = [];
    const definitionBits = [];

    // Mutates classNameBits and definitionBits and returns a length which we
    // will append to the hash to decrease the chance of hash collisions.
    const length = processStyleDefinitions(
        styleDefinitions,
        classNameBits,
        definitionBits,
        0,
    );

    // Break if there aren't any valid styles.
    if (classNameBits.length === 0) {
        return "";
    }

    let className;
    if (process.env.NODE_ENV === 'production') {
        className = classNameBits.length === 1 ?
            `_${classNameBits[0]}` :
            `_${hashString(classNameBits.join())}${(length % 36).toString(36)}`;
    } else {
        className = classNameBits.join("-o_O-");
    }

    injectStyleOnce(
        context,
        className,
        `.${className}`,
        definitionBits,
        useImportant,
        selectorHandlers
    );

    return className;
}
