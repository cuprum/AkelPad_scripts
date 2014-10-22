// === autoInsertTab.js === http://akelpad.sourceforge.net/forum/viewtopic.php?p=26347#26347
// (с) Cuprum
//
// Если каретка непосредственно расположена:
// a) между открывающим и закрывающим тегом в html-файлах
// б) между открывающей и закрывающей фигурными скобками ({}) в css-, less-, js-файлах,
// то при нажатии клавиши Enter вместе с переводом на новую строку вставляется символ табуляции.
//
// 1.0 (22.10.2014)
//
// Пример:
//    Call("Scripts::Main", 1, "autoInsertTab.js") 
// Горячая клавиша для скрипта - Enter
//
// Зависимости:
//    Используется библиотека CoderFunctions.js http://akelpad.sourceforge.net/forum/viewtopic.php?p=19641#19641


var hMainWnd = AkelPad.GetMainWnd(),
	hWndEdit = AkelPad.GetEditWnd(),
	hWndFocus = AkelPad.SendMessage(hMainWnd, 1317 /*AKD_GETFOCUS*/, 0, 0),
	oSys = AkelPad.SystemFunction(),
	flieExts1 = "css|js|less",
	flieExts2 = "html|htm|xml",
	TextAroundCarriage,
	TextBeforeCarriage,
	TextAfterCarriage,
	ext;

function SetRedraw(hWnd, bRedraw) {
	AkelPad.SendMessage(hWnd, 11 /*WM_SETREDRAW*/, bRedraw, 0);

	if (bRedraw) {
		oSys.Call("user32::InvalidateRect", hWnd, 0, true);
	}
}

function getTextAroundCarriage(beforeCarriage, afterCarriage) {
	var carriage = AkelPad.GetSelStart(),
		textRange;

	beforeCarriage = carriage - beforeCarriage;
	afterCarriage = carriage + afterCarriage;
	textRange = AkelPad.GetTextRange(beforeCarriage, afterCarriage);

	return textRange;
}

// Перевод каретки на новую строку с последующей вставкой табуляции. Следит за сохранением отступов слева.
// При вызове с аргументом 1, делает два перевода на новую строку, возвращает каретку на строку вверх и вставляет табуляцию.
function insertTab(arg) {
	var bKeepSpace = AkelPad.SendMessage(hMainWnd, 1222 /*AKD_GETMAININFO*/, 146 /*MI_KEEPSPACE*/, 0),
	carriage;

	SetRedraw(hWndEdit, false);
	if (!bKeepSpace) {
		AkelPad.Command(4254 /*IDM_OPTIONS_KEEPSPACE*/);
	}
	AkelPad.SendMessage(hWndEdit, 258 /*WM_CHAR*/, 13 /*VK_RETURN*/, 0);
	if (arguments[0] === 1) {
		carriage = AkelPad.GetSelStart();
		AkelPad.SendMessage(hWndEdit, 258 /*WM_CHAR*/, 13 /*VK_RETURN*/, 0);
		AkelPad.SetSel(carriage, carriage);
	}
	AkelPad.Command(4164 /*IDM_EDIT_INSERT_TAB*/);
	if (!bKeepSpace) {
		AkelPad.Command(4254 /*IDM_OPTIONS_KEEPSPACE*/);
	}
	SetRedraw(hWndEdit, true);
	WScript.Quit();
}

if (AkelPad.Include("CoderFunctions.js")) {
	ext = GetSyntaxAliasExtension(hWndEdit);

	if (hWndEdit == hWndFocus) {
		if (flieExts1.indexOf(ext) >= 0) { // js, css, less
			TextBeforeCarriage = getTextAroundCarriage(1, 0);
			TextAfterCarriage = getTextAroundCarriage(0, 1);
		} else if (flieExts2.indexOf(ext) >= 0) { // html, htm, xml
			TextAroundCarriage = getTextAroundCarriage(1, 2);
		}

		if ((TextBeforeCarriage === "{" && TextAfterCarriage === "}") || TextAroundCarriage === "></") {
			insertTab(1);
		} else if (TextBeforeCarriage === "{" && TextAfterCarriage !== "}") {
			insertTab();
		}
	}
}

if (hWndFocus) {
	AkelPad.SendMessage(hWndFocus, 258 /*WM_CHAR*/, 13 /*VK_RETURN*/, 0);
}