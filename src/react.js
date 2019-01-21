import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';

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

function getDisplayName(WrappedComponent /* : ComponentType */) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export const CSSContext /* : Context */ = React.createContext();

export function withCSS (WrappedComponent /* : ComponentType */) {
    const withDisplayName = `withCSS(${getDisplayName(WrappedComponent)})`;

    class Wrapper extends React.Component {
        static displayName = withDisplayName;
        static WrappedComponent = WrappedComponent;

        constructor (props) {
            super(props);
            this.renderContext = this.renderContext.bind(this);
            this.css = this.css.bind(this);
        }

        css (context /* : StyleContext */, ) {
            // Avoid a circular import
            const {css} = require('./index')

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

    return hoistNonReactStatics(Wrapper, WrappedComponent, {});
}

export const CSSProvider = CSSContext.Provider
