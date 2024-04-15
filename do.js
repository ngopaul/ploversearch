var rot = {};
var count_recursive_calls = 0;
var best_hint_so_far = "";
var start_time = 0;
var end_time = 0;
var codes_used = {};

function loadDict(dict) {
    $.getJSON(dict, function (dict) {
        $('#status').text('Parsing dictionary...');
        // {
        //  'ras': { 'Raspberry': [ 'R-B', 'R*B'] },
        //  'pon': { 'ponies': [ 'P' ], 'pony': [ 'P-P' ] }
        // }
        $.each(dict, function (key, val) {
            if (codes_used[key])
                return true;
            codes_used[key] = true;
            if (val.length < 2)
                return true;
            var pre = summarise(val);
            if (typeof rot[pre] !== 'object')
                rot[pre] = new Object();
            if (typeof rot[pre][val] !== 'object')
                rot[pre][val] = new Array();
            rot[pre][val].push(key);
        });
        delete dict;
    }).fail(function (xhr, stat, error) {
        $('#status').text('Fatal error downloading dictionary.  Nothing more to see here...' + stat + " / " + error);
    });
}

function start() {
    $('#status').text('JQuery works!  Downloading dictionary...');
    // load dictionary_order.json to get the list of dictionaries we need to load
    $.getJSON("dictionary_order.json", function (dicts) {
        for (var i = 0; i < dicts.length; i++) {
            loadDict(dicts[i]);
        }
    }).fail(function (xhr, stat, error) {
        $('#status').text('Fatal error downloading dictionary_order.json.  Nothing more to see here...' + stat + " / " + error);
    });

    $('#search').keyup(function () {
        delay(function () {
            doSearch(rot);
        }, 200);
    });

    // allow the user to directly link to a search term
    window.addEventListener('hashchange', function() {
        $('#search').val(window.location.hash.substring(1));
        doSearch(rot);
    }, false);

    resultTable();
    if (window.location.hash) {
        $('#search').val(window.location.hash.substring(1));
        doSearch(rot);
    }
    $('#search').show();
}

function startsWith(haystack, needle) {
    return haystack.substring(0, needle.length) == needle;
}

function summarise(val) {
    return val.substring(0, 3).toLowerCase();
}

var prev = '';

// https://stackoverflow.com/questions/1909441/jquery-keyup-delay
var delay = (function () {
    var timer = 0;
    return function (callback, ms) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
    };
})();

function resultTable() {
    var r = $('#result').find('tbody');
    r.empty();
    return r;
}

function doSearch(dict) {
    start_time = new Date().getTime();
    term = $('#search').val();
    if (term == prev) {
        return;
    }
    prev = term;

    window.location.hash = term;
    history.pushState(term, '', window.location);

    var r = resultTable();
    if (term.length <= 1) {
        return;
    }

    var pre = summarise(term);

    if (!(pre in dict)) {
        return;
    }

    var hadExact = false;
    if (dict[pre][term]) {
        $.each(dict[pre][term], function (idx, code) {
            addTr(r, code, term);
        });
        hadExact = true;
    }
    var loading = $('<td>')
        .attr('colspan', '2')
        .css('text-align', 'center')
        .attr('id', 'inexact')
        .text("(inexact results loading...)");

    r.append($('<tr>').append(loading));

    setTimeout(function () {
        var total = addMatchesToTable(dict[pre], r, function (trans, term) {
            var v = trans.toLowerCase();
            return trans == term || !startsWith(v, term.toLowerCase());
        });
        var inex = $('#inexact');
        if (0 != total)
            inex.text('(' + total
                + ' inexact match' + (total == 1 ? '' : 'es') + ')');
        else if (total > 50)
            inex.text('(over 50 inexact matches)');
        else
            inex.text('(no ' + (hadExact ? 'further ' : '') + 'matches)');
    }, 0);
    end_time = new Date().getTime();
    console.log("Total time: " + (end_time - start_time) + "ms");
    // $('#time_taken').text("Time taken: " + (end_time - start_time) + "ms");
}

function addMatchesToTable(dict, r, reject) {
    var found = 0;
    $.each(dict, function (trans, codes) {
        if (found > 50) {
            return false;
        }
        if (reject(trans, term)) {
            return true;
        }
        ++found;
        $.each(codes, function (idx, code) {
            addTr(r, code, trans);
        });
    });
    return found;
}

function addTr(r, code, trans) {
    var cell = $('<td>');
    var splt = code.split(/\//);
    var decomposition_hint_so_far = "";
    $.each(splt, function (idx, val) {
        var tab = $('<table>');
        var first = $('<tr>');
        var second = $('<tr>');
        tab.append(first);
        tab.append(second);
        let decomposition_and_hint = decompose(val, trans, decomposition_hint_so_far);
        let decomposition = decomposition_and_hint[0];
        let best_hint = decomposition_and_hint[1];
        decomposition_hint_so_far += best_hint;
        $.each(decomposition, function (inner, part) {
            var td = $('<td>');
            if (part.strokes.length <= 1)
                td.text(part.strokes)
                    .addClass('notranslate');
            else {
                td.append($('<u>')
                    .css('color', colorFor[part.strokes])
                    .append($('<span>')
                        .css('color', 'black')
                        .addClass('notranslate')
                        .text(part.strokes)
                    ));
            }

            first.append(td);
            second.append($('<td>')
                .css('color', colorFor[part.strokes])
                .addClass('notranslate')
                .text(part.hint));
        });
        if (idx != splt.length - 1) {
            first.append($('<td>').text('/'));
            second.append($('<td>'));
        }
        cell.append(tab);
    });
    r.append($('<tr>')
        .append(cell)
        .append($('<td>').text(trans))
    );
}

var meanings = [
    {from: "STKPW", to: "z"},
    {from: "SKWR", to: "j"},
    {from: "TKPW", to: "g"},
    {from: "PBLG", to: "j"},
    {from: "KWR", to: "y"},
    {from: "TPH", to: "n"},
    {from: "BGS", to: "x"},
    {from: "FPL", to: "sm"},
    {from: "FRB", to: "rv"},
    {from: "KHR", to: "cl"}, // not ch-r
    {from: "PHR", to: "pl"}, // not m-r
    {from: "SR", to: "v"},
    {from: "TK", to: "d"},
    {from: "TP", to: "f"},
    {from: "PH", to: "m"},
    {from: "PW", to: "b"},
    {from: "KW", to: "q"},
    {from: "HR", to: "l"},
    {from: "KP", to: "x"},
    {from: "FP", to: "ch"},
    {from: "RB", to: "sh"},
    {from: "PB", to: "n"},
    {from: "PL", to: "m"},
    {from: "BG", to: "k"},
    {from: "GS", to: "ion"},
    {from: "TH", to: "th"},
    {from: "KH", to: "ch"},
    {from: "SH", to: "sh"},
    {from: "AOEU", to: "eye"},
    {from: "AEU", to: "aa"},
    {from: "AOE", to: "ee"},
    {from: "AOU", to: "oo"},
    {from: "OEU", to: "oy"},
    {from: "AU", to: "aw"},
    {from: "EA", to: "ea"},
    {from: "OU", to: "ow"},
    {from: "EU", to: "i"},
    {from: "OE", to: "oh"},
    {from: "AO", to: "oo"},
    {from: "*", to: ""},
    {from: "-", to: ""}
];

/*
Calculate the phonetic similarity between two strings, a and b, weighting towards if a is a substring of b or vice versa.
This is a rough approximation and should be replaced with a phonetic algorithm.
Args:
  a: the first string
  b: the second string
Returns: a number between 0 and 1, where 1 means the strings are identical and 0 means they are completely different
 */
function calculate_similarity(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();

    let ratio1 = b.includes(a) || a.includes(b) ? 1 : 0;

    let s = new difflib.SequenceMatcher(null, a, b);
    let ratio2 = s.ratio();

    // Get some tricky cases, such as "District of Columbia".
    // this is a rough approximation but should be replaced with a phonetic algorithm
    // replace all y with i
    // replace all g with c
    // replace all k with c
    // replace all b with n
    // replace ohn with on
    let s2 = new difflib.SequenceMatcher(
      null,
      a.replace(/y/g, 'i').replace(/g/g, 'c').
      replace(/k/g, 'c').replace(/b/g, 'n').
      replace(/ohn/g, 'on'),
      b.replace(/y/g, 'i').replace(/g/g, 'c').
      replace(/k/g, 'c').replace(/b/g, 'n').
      replace(/ohn/g, 'on')
    );
    let ratio3 = s2.ratio() * 0.9;

    return Math.max(ratio1, ratio2, ratio3);
}

/*
Handle base cases for single-letter codes.
This allows us to substitute f, v, or s for "F"
This allows us to substitute g, or -ing for "G"
It also allows us to substitute special sounds, like c or k for "G", if the code contains an asterisk
Args:
  x: the single letter code
  asterisk: whether the whole code contains an asterisk
Returns: a list of possible meanings of the code
 */
function meanings_single_letter(x, asterisk=false) {
    if (x === 'F' || x === 'f') {
        return [[{from: 'F', to: 'f'}], [{from: 'F', to: 'v'}], [{from: 'F', to: 's'}]];
    }
    if (x === 'G' || x === 'g') {
        let possible_return = [[{from: 'G', to: 'g'}], [{from: 'G', to: 'ing'}]];
        if (asterisk) {
            possible_return.push([{from: 'G', to: 'c'}]);
            possible_return.push([{from: 'G', to: 'k'}]);
        }
        return possible_return;
    }
    return [[{from: x, to: x.toLowerCase()}]];
}

/*
Return all possible decompositions of the given code, in a list of
objects, each with a 'strokes' and 'hint' property.
Args:
  code: the code to decompose
  previous_hint: the hint so far, which should somewhat match the translation
  trans: the translation to match
  had_asterisk: whether the code contains an asterisk - this allows for some modifications to the decomposition
    (e.g. replacing G with C or K)
Returns: a list of all possible decompositions of the code
  a decomposition is a list of {} objects, each with a 'strokes' and 'hint' property
*/
function decompose_helper(code, previous_hint, trans, had_asterisk) {
    count_recursive_calls++;
    if ('' === code) return [];

    let possible_matches = [];
    let possible_ends = [];

    // add matches in the known hints
    for (let i = 0; i < meanings.length; ++i) {
        if (startsWith(code, meanings[i].from)) {
            possible_matches.push(meanings[i]);
            if (possible_matches[possible_matches.length - 1].to === undefined) {
                console.log("No hint for meaning: " + meanings[i] + " in code: " + code + " and prevhint: " + previous_hint);
            }
            possible_ends.push(meanings[i].from.length);
        } else if (startsWith(code.replace('*', ''), meanings[i].from)) {
            possible_matches.push(meanings[i]);
            if (!possible_matches[possible_matches.length - 1].to === undefined) {
                console.log("No hint for meaning: " + meanings[i] + " in code: " + code + " and prevhint: " + previous_hint);
            }
            possible_ends.push(meanings[i].from.length + 1);
        }
    }

    // add single character matches
    let x = code.substring(0, 1);
    let base_cases = meanings_single_letter(x, asterisk=had_asterisk);
    for (let i = 0; i < base_cases.length; ++i) {
        possible_matches.push(base_cases[i][0]);
        possible_ends.push(1);
    }

    // sort possible_matches alongside possible_ends by how closely it matches the translation
    // in the future, this can be used to prune the search space (not implemented yet)
    // first, make some robust tests to see if this is a good idea
    // let zipped = [];
    // for (let i = 0; i < possible_matches.length; i++) {
    //     zipped.push([possible_matches[i], possible_ends[i]]);
    // }
    // zipped.sort(function(a, b) {
    //     let hint1 = a[0].to;
    //     let hint2 = b[0].to;
    //     return calculate_similarity(previous_hint + hint1, trans) -
    //       calculate_similarity(previous_hint + hint2, trans);
    // })
    // possible_matches = [];
    // possible_ends = [];
    // for (let i = 0; i < zipped.length; i++) {
    //     possible_matches.push(zipped[i][0]);
    //     possible_ends.push(zipped[i][1]);
    // }

    let ret = [];
    for (let i = 0; i < possible_matches.length; ++i) {
        let meaning = possible_matches[i];
        let hint = meaning.to;
        if (hint === undefined) {
            console.log("No hint for meaning: " + meaning + " in code: " + code + " and prevhint: " + previous_hint);
        }
        let end = possible_ends[i];
        let subcalls = decompose_helper(code.substring(end), previous_hint + hint, trans, had_asterisk);
        // base case
        if (subcalls.length === 0) {
            ret.push([{
                strokes: code.substring(0, end),
                hint: hint
            }]);
        }
        for (let j = 0; j < subcalls.length; ++j) {
            let subcall = subcalls[j];
            let item_to_push = [{
                strokes: code.substring(0, end),
                hint: hint
            }];
            ret.push(item_to_push.concat(subcall));
        }
    }
    return ret;
}

/*
Decompose the given code into its parts, using decompose_helper to
get all possible decompositions of the code.  Choose the best decomposition
that matches the translation trans.
Some tough ones: "District of Columbia", "things", "nevertheless", TODO: "Pony Express", "raspberries"
 */
function decompose(code, trans, decomposition_hint_so_far) {
    count_recursive_calls = 0;
    best_hint_so_far = "";
    if ('' === code) return [];
    let decompositions = decompose_helper(code, decomposition_hint_so_far, trans, code.includes('*'));
    let best = 0;
    let best_score = 0;
    let best_hint = "";
    let complete_hints = [];
    for (let i = 0; i < decompositions.length; ++i) {
        // concatenate all the hints of the decomposition together
        var part_complete_hint = "";
        for (let j = 0; j < decompositions[i].length; ++j) {
            part_complete_hint += decompositions[i][j].hint;
        }
        complete_hints.push(decomposition_hint_so_far + part_complete_hint);
        let score = calculate_similarity(decomposition_hint_so_far + part_complete_hint, trans);
        if (score > best_score) {
            best = i;
            best_score = score;
            best_hint = part_complete_hint;
        }
    }
    // console.log("Total hints: " + complete_hints.join(", ") + " for code: " + code + " and translation: " + trans);
    // console.log("Best hint: " + best_hint);
    // console.log("Recursive calls for best-hint selection: " + count_recursive_calls);
    return [decompositions[best], best_hint];
}

function rainbow(numOfSteps, step) {
    // Adam Cole, 2011-Sept-14
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch (i % 6) {
        case 0:
            r = 1, g = f, b = 0;
            break;
        case 1:
            r = q, g = 1, b = 0;
            break;
        case 2:
            r = 0, g = 1, b = f;
            break;
        case 3:
            r = 0, g = q, b = 1;
            break;
        case 4:
            r = f, g = 0, b = 1;
            break;
        case 5:
            r = 1, g = 0, b = q;
            break;
    }
    var c = "#"
        + ("00" + (~~(r * 255)).toString(16)).slice(-2)
        + ("00" + (~~(g * 255)).toString(16)).slice(-2)
        + ("00" + (~~(b * 255)).toString(16)).slice(-2);
    return (c);
}

var colorFor = {};
for (var i = 0; i < meanings.length; ++i) {
    colorFor[meanings[i].from] = rainbow(meanings.length, i);
}
