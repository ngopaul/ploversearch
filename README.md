# Plover Lookup with Highlighting

This is a simple local web page that serves a Plover dictionary 
and allows you to look up words in it. It highlights the strokes 
according to Plover theory, in the dictionaries that you provide.

The dictionaries used are from [didoesdigital/steno-dictionaries](https://github.com/didoesdigital/steno-dictionaries).

## Running locally

1. `git clone https://github.com/ngopaul/ploversearch`
2. `git submodule update --init --remote steno-dictionaries`
    - If doing this a second time to update the dictionaries, exclude the `--init`.
3. Open `index.html` in your local browser
4. Optionally, you can add your `user.json` or any local dictionaries to the local folder.
5. Then update `dictionary_order.json` to update the order in which the dictionaries are loaded.

## Demo

See a demo at [https://ngopaul.github.io/ploversearch/](https://ngopaul.github.io/ploversearch/).

## Limitations and To-Dos

- Only searches through words of length 2 or greater
- Still doesn't highlight some words correctly based on phonetics
