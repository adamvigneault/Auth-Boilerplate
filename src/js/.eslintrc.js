module.exports = {
    "extends": "eslint-config-airbnb-es5",
    "rules": {
        "func-names": ["error", "never"],
        "prefer-arrow-callback": 0,
        "prefer-rest-params": 0,
        "prefer-template": 0,
        "object-shorthand": ["error", "never"],
        "no-restricted-globals": 0,
        "no-param-reassign": 0,
        "no-undef": 0,
        "no-alert": 0,
        "prefer-destructuring": ["error", {
            "array": false,
            "object": false
        }]
    }
};