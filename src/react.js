import React from 'react';
import {css} from './index';

/* ::
import type {ComponentType, Node} from 'react';
import type {StyleContext} from './inject.js';

export type Context = {
    Consumer: ComponentType < {
        children: (value: StyleContext) => Node
    } > ,
    Provider: ComponentType < {
        value: StyleContext
    } >
};
*/

export const CSSContext /* : Context */ = React.createContext();

export const withCSS = (WrappedComponent /* : ComponentType */) => (
    class Wrapper extends React.Component {
        constructor (props) {
            super(props);
            this.renderContext = this.renderContext.bind(this);
            this.css = this.css.bind(this);
        }

        css (context /* : StyleContext */, ) {
            return (...styleDefinitions /* : MaybeSheetDefinition[] */) => {
                return css(context, styleDefinitions)
            }
        }

        render () {
            return (
                <CSSContext.Consumer>
                    {this.renderContext}
                </CSSContext.Consumer>
            )
        }

        renderContext (context /* : StyleContext */) {
            return <WrappedComponent {...this.props} css={this.css(context)} />
        }
    }
)

export const CSSProvider = CSSContext.Provider
