import {
  Context, ProviderExoticComponent, ProviderProps, ComponentType, ComponentClass,
  StatelessComponent, Component,
} from 'react'

import {
    CSSProperties,
    CSSPropertiesComplete,
    CSSPropertiesLossy,
    CSSPropertiesPseudo,
    CSSWideKeyword,
} from './css-properties';

export {
    CSSProperties,
    CSSPropertiesComplete,
    CSSPropertiesLossy,
    CSSPropertiesPseudo,
    CSSWideKeyword,
};

/**
 * afrododi style declaration
 */
export type StyleDeclarationMap = Map<keyof CSSProperties, string | number>;
export type StyleDeclaration<T = {}> = {
    [P in keyof T]: CSSProperties | StyleDeclarationMap;
};

/**
 * Style buffer context
 */
export interface StyleContext {
  styleTag?: HTMLStyleElement,
  alreadyInjected: { [key: string]: boolean },
  injectionBuffer: string[],
  isBuffering: boolean,
}

/**
 * Return value from StyleSheet.create.
 */
export type StyleDeclarationValue = object;

export interface StyleSheetStatic {
    /**
     * Create style sheet
     */
    create<T extends StyleDeclaration<T>>(
        styles: T
    ): {[K in keyof T]: StyleDeclarationValue };
    /**
     * Rehydrate class names from server renderer
     */
    rehydrate(context: StyleContext, renderedClassNames: string[]): void;

    extend(extensions: Extension[]): Exports;
}

export var StyleSheet: StyleSheetStatic;

type CSSInputTypes = StyleDeclarationValue | false | null | void;
/**
 * Get class names from passed styles
 */
export function css(...styles: CSSInputTypes[]): string;

/**
 *  Override afrododi minifying styles to hashes in production
 */
export function minify(shouldMinify: boolean): void;

interface StaticRendererResult {
    html: string;
    css: {
        content: string;
        renderedClassNames: string[];
    };
}

/**
 * Utilities for using afrododi server-side.
 */
interface StyleSheetServerStatic {
    renderStatic(renderFunc: (context: StyleContext) => string): StaticRendererResult;
    renderStaticAsync(renderFunc: (context: StyleContext) => Promise<string>):
      Promise<StaticRendererResult>;
}

export var StyleSheetServer: StyleSheetServerStatic;

interface StyleSheetTestUtilsStatic {
    /**
     * Gets a new StyleContext instance to use during testing
     *
     * @returns {object}  StyleContext instance for use during testing
     */
    getContext(): StyleContext;
    /**
     * Returns a string of buffered styles which have not been flushed
     *
     * @returns {string}  Buffer of styles which have not yet been flushed.
     */
    getBufferedStyles(context: StyleContext): string[];
}

export var StyleSheetTestUtils: StyleSheetTestUtilsStatic;

export interface SelectorHandler {
    (selector: string, baseSelector: string, callback: (selector: string) => string):
        | string
        | null;
}

export interface Extension {
    selectorHandler?: SelectorHandler;
}

export interface CSSProps {
    css(...styles: CSSInputTypes[]): string
}

export type CSSContext = Context<StyleContext>;
export type CSSProvider = ProviderExoticComponent<ProviderProps<StyleContext>>

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;


export function withCSS<P extends CSSProps>(component: ComponentType<P>):
  ComponentClass<Omit<P, keyof CSSProps>>;

/**
 * Calling StyleSheet.extend() returns an object with each of the exported
 * properties on it.
 */
interface Exports {
    css(context: StyleContext, ...styles: CSSInputTypes[]): string;
    StyleSheet: StyleSheetStatic;
    StyleSheetServer: StyleSheetServerStatic;
    StyleSheetTestUtils: StyleSheetTestUtilsStatic;
}
