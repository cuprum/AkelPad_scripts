// === [autoInsertQuotes.js] ===
// http://akelpad.sourceforge.net/forum/viewtopic.php?p=26484#26484
// https://github.com/cuprum/AkelPad_scripts/blob/master/autoInsertQuotes.js
//
// (c) Cuprum  2014
//
// Автоматически добавляет кавычки после печати знака равенства внутри HTML-тега.
// Горячая клавиша для скрипта '='.
//
// Adding qoutes for attribute value on typing equals sign(=) inside HTML tag.
// Hotkey for script is '='
//
// Arguments:
//    -singleQuotes                     - Set single quotes after typing =.
//    -fileExts="htm, html, php"        - Allows to set custom file extensions. Default is "html, xml".
//
// Usage:
//    Call("Scripts::Main", 1, "autoInsertQuotes.js")
//    Call("Scripts::Main", 1, "autoInsertQuotes.js",'-singleQuotes')
//    Call("Scripts::Main", 1, "autoInsertQuotes.js",'-fileExts="htm, html, php" -singleQuotes')
//
// Versions:
//    1.1 (5.11.2014)
//      Typing '=' without quotes inside attribute value.
//
//    1.0 (1.11.2014)
//      Initial release.


var hMainWnd = AkelPad.GetMainWnd(),
	hWndEdit = AkelPad.GetEditWnd(),
	hWndFocus = AkelPad.SendMessage(hMainWnd, 1317 /*AKD_GETFOCUS*/, 0, 0),
	fileExts = AkelPad.GetArgValue("fileExts", "html, xml"),
	quotes = "\"\"",
	LastTagPattern = /<[a-z][^\s>\/]*(?:[^>"']|"[^"]*"|'[^']*')*$/i,
	attrPattern = /\s+[\-\w]+$/,
	currentExt,
	args,
	textStr;

// http://akelpad.sourceforge.net/forum/viewtopic.php?p=11382#11382
function GetOffset(hWndEdit, nType /*AEGI_*/, nOffset) {
	var lpIndex;

	if (lpIndex = AkelPad.MemAlloc(_X64?24:12 /*sizeof(AECHARINDEX)*/)) {
		if (nOffset != -1) {
			AkelPad.SendMessage(hWndEdit, 3137 /*AEM_RICHOFFSETTOINDEX*/, nOffset, lpIndex);
		}
		AkelPad.SendMessage(hWndEdit, 3130 /*AEM_GETINDEX*/, nType, lpIndex);
		nOffset = AkelPad.SendMessage(hWndEdit, 3136 /*AEM_INDEXTORICHOFFSET*/, 0, lpIndex);
		AkelPad.MemFree(lpIndex);
	}
	return nOffset;
}

function GetTextLineStartToCaret() {
	var nCaretPos,
		nCaretLineStartPos;

	nCaretPos = GetOffset(hWndEdit, 5 /*AEGI_CARETCHAR*/, -1);
	nCaretLineStartPos = GetOffset(hWndEdit, 18 /*AEGI_WRAPLINEBEGIN*/, nCaretPos);

	return AkelPad.GetTextRange(nCaretLineStartPos, nCaretPos);
}

// Compiling based on http://akelpad.sourceforge.net/forum/viewtopic.php?p=19641#19641
function GetFileExt() {
	var hWndEdit = AkelPad.GetEditWnd(),
		hDocEdit = AkelPad.GetEditDoc(),
		pAlias="",
		lpAlias,
		fileExt;

	if (!hWndEdit || !hDocEdit) {
		return "";
	}
	if (lpAlias = AkelPad.MemAlloc(256 * 2 /*sizeof(wchar_t)*/)) {
		AkelPad.CallW("Coder::Settings", 18 /*DLLA_CODER_GETALIAS*/, hWndEdit, hDocEdit, lpAlias, 0);
		pAlias = AkelPad.MemRead(lpAlias, 1 /*DT_UNICODE*/);
		AkelPad.MemFree(lpAlias);
	}
	if (pAlias) {
		fileExt = pAlias.split('.');
		fileExt = fileExt[fileExt.length - 1];
	}

	return fileExt;
}

function insertQuotes(quotes) {
	var nCaretPos;

	AkelPad.ReplaceSel("=" + quotes);
	nCaretPos = AkelPad.GetSelStart() - 1;
	AkelPad.SetSel(nCaretPos, nCaretPos);
	WScript.Quit();
}

currentExt = GetFileExt();

if (args = AkelPad.GetArgLine()) {
	if (args.indexOf("singleQuotes") >= 0) {
		quotes = "''";
	}
}

if (fileExts.indexOf(currentExt) >= 0) {
	textStr = GetTextLineStartToCaret();

	if (LastTagPattern.test(textStr) && attrPattern.test(textStr)) {
		insertQuotes(quotes);
	}
}

if (hWndFocus) {
	AkelPad.SendMessage(hWndFocus, 258 /*WM_CHAR*/, 61 /*=*/, 0);
}
