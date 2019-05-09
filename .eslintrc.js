module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "one-var": [2,"always"],
        "no-var" : 0,
        "comma-dangle" : 0,
        "no-underscore-dangle" : 0,
        "max-len" : [2, {"code": 80}],
        "no-shadow": ["error", {
            "allow": ["err", "done", "cb"]
        }],
        "no-use-before-define": 0,
        "eqeqeq": 0
    }
};