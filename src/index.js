import makeExports from './exports';

const useImportant = true; // Add !important to all style definitions

const afrododi = makeExports(useImportant);

const {
    StyleSheet,
    StyleSheetServer,
    StyleSheetTestUtils,
    css,
    minify,
    flushToStyleTag,
    injectAndGetClassName,
    defaultSelectorHandlers,
    CSSProvider,
    withCSS,
} = afrododi;

export {
    StyleSheet,
    StyleSheetServer,
    StyleSheetTestUtils,
    css,
    minify,
    flushToStyleTag,
    injectAndGetClassName,
    defaultSelectorHandlers,
    CSSProvider,
    withCSS,
};
