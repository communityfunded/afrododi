// afrododi server-side rendering example

// Make a component that generates some styles and returns some HTML.
function render() {
    const {StyleSheet, css} = require("afrododi/no-important");

    // Make some styles
    const styles = StyleSheet.create({
        red: {
            color: "red",

            ":hover": {
                color: "blue",
            },
        },
    });

    // Generate some CSS with afrododi class names in it.
    return `<div class=${css(styles.red)}>
        Hover, and I'll turn blue!
    </div>`;
}

const {StyleSheetServer} = require("afrododi");

// Call our render function inside of StyleSheetServer.renderStatic
const {css, html} = StyleSheetServer.renderStatic(() => {
    return render();
});

// Observe our output HTML and the afrododi-generated CSS
`<style>${css.content}</style>${html}`;
