import {ComponentType, ComponentClass} from 'react'

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * A property P will be present if:
 * - it is present in DecorationTargetProps
 *
 * Its value will be dependent on the following conditions
 * - if property P is present in InjectedProps and its definition extends the definition
 *   in DecorationTargetProps, then its definition will be that of DecorationTargetProps[P]
 * - if property P is not present in InjectedProps then its definition will be that of
 *   DecorationTargetProps[P]
 * - if property P is present in InjectedProps but does not extend the
 *   DecorationTargetProps[P] definition, its definition will be that of InjectedProps[P]
 */
export type Matching<InjectedProps, DecorationTargetProps> = {
  [P in keyof DecorationTargetProps]: P extends keyof InjectedProps
      ? InjectedProps[P] extends DecorationTargetProps[P]
          ? DecorationTargetProps[P]
          : InjectedProps[P]
      : DecorationTargetProps[P];
};

/**
 * a property P will be present if :
 * - it is present in both DecorationTargetProps and InjectedProps
 * - InjectedProps[P] can satisfy DecorationTargetProps[P]
 * ie: decorated component can accept more types than decorator is injecting
 *
 * For decoration, inject props or ownProps are all optionally
 * required by the decorated (right hand side) component.
 * But any property required by the decorated component must be satisfied by the injected property.
 */
export type Shared<
    InjectedProps,
    DecorationTargetProps extends Shared<InjectedProps, DecorationTargetProps>
    > = {
        [P in Extract<keyof InjectedProps, keyof DecorationTargetProps>]?: InjectedProps[P] extends DecorationTargetProps[P] ? DecorationTargetProps[P] : never;
    };

// Infers prop type from component C
export type GetProps<C> = C extends ComponentType<infer P> ? P : never;

// Applies LibraryManagedAttributes (proper handling of defaultProps
// and propTypes), as well as defines WrappedComponent.
export type ConnectedComponentClass<C, P> = ComponentClass<JSX.LibraryManagedAttributes<C, P>> & {
    WrappedComponent: C;
};

// Injects props and removes them from the prop requirements.
// Will not pass through the injected props if they are passed in during
// render. Also adds new prop requirements from TNeedsProps.
export type InferableComponentEnhancerWithProps<TInjectedProps, TNeedsProps> =
    <C extends ComponentType<Matching<TInjectedProps, GetProps<C>>>>(
        component: C
    ) => ConnectedComponentClass<C, Omit<GetProps<C>, keyof Shared<TInjectedProps, GetProps<C>>> & TNeedsProps>;

// Injects props and removes them from the prop requirements.
// Will not pass through the injected props if they are passed in during
// render.
export type InferableComponentEnhancer<TInjectedProps> =
  InferableComponentEnhancerWithProps<TInjectedProps, {}>;
