// [createSelectedFile.js]
// http://akelpad.sourceforge.net/forum/viewtopic.php?p=26939#26939
// https://github.com/cuprum/AkelPad_scripts/blob/master/createSelectedFile.js
// 
// Author: Cuprum
//...............................................................................
//
// Создание файла на основе выделения.
// Файл создается, когда выделенный текст является названием файла (имя + расширение) или относительным путем, оканчивающимся файлом;
// расширение файла внутри выделенного фрагмента должно соответствовать определенному значению (см. -exts в описании аргументов).
// Если файл уже существует, то он будет открыт.
// При использовании ключа -forceQuotes проверяется наличие выделенного текста, и если его нет, для анализа берется текст
// между ближайшими парными кавычками, окружающими курсор.
//
// Allow to create file from selection. Selection must be file (name + extension) or relative path with file.
// File extension must matched with list (see -exts in 'Arguments' section).
// If a selected file exists, it will be opened.
//
// Arguments:
//    -path="%f"                     Required argument.
//    -msg                           Show dialog box before creating file.
//    -exts="ext1|ext2|ext3|ext4"    Set custom file extensions. Default is "js|css|less".
//    -forceQuotes                   Get file path from nearest quoted text relative to the cursor if no selection (or selection is wrong).
//
// Usage:
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f"`)
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f" -exts="css|js|less|htm|html"`)
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f" -msg -exts="css|js|less|htm|html"`)
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f" -msg -forceQuotes -exts="css|js|less|htm|html"`)
//
// Versions:
//    1.1.0 (29.11.2015)
//      Add the ability to work without selected text (argument -forceQuotes).
//    1.0.1 (28.11.2015)
//      Fix regexp for file path.
//    1.0.0 (11.12.2014)
//      Initial release.


var FileMaker;
var aCurrentLineWithCaretPos;
var hWndMain = AkelPad.GetMainWnd();
var hWndEdit = AkelPad.GetEditWnd();
var hWndFocus = AkelPad.SendMessage(hWndMain, 1317 /*AKD_GETFOCUS*/, 0, 0);
var pSelText = AkelPad.GetSelText();
var localize = function(o) {
	var lng = AkelPad.GetLangId(0 /*LANGID_FULL*/);

	switch (lng) {
		case 1049: /*RU*/
			o.sLngFile = "Файл\n";
			o.sLngCreate = "\nне существует. Создать?";
			break;
		default: /*EN*/
			o.sLngFile = "File\n";
			o.sLngCreate = "\ndoesn't exist. Create?";
			break;
	}
};
var oScrArgs = {
		sCurPath: AkelPad.GetArgValue("path", ""),
		nIsConfirmMsg: AkelPad.GetArgValue("msg", 0),
		sExts: AkelPad.GetArgValue("exts", "js|css|less"),
		nIsForceQuotes: AkelPad.GetArgValue("forceQuotes", 0)
	};

// http://akelpad.sourceforge.net/forum/viewtopic.php?p=11382#11382
function GetOffset (hWndEdit, nType /*AEGI_*/, nOffset) {
	var lpIndex;

	if ( lpIndex = AkelPad.MemAlloc(_X64?24:12 /*sizeof(AECHARINDEX)*/) ) {
		if (nOffset != -1) {
			AkelPad.SendMessage(hWndEdit, 3137 /*AEM_RICHOFFSETTOINDEX*/, nOffset, lpIndex);
		}
		AkelPad.SendMessage(hWndEdit, 3130 /*AEM_GETINDEX*/, nType, lpIndex);
		nOffset = AkelPad.SendMessage(hWndEdit, 3136 /*AEM_INDEXTORICHOFFSET*/, 0, lpIndex);
		AkelPad.MemFree(lpIndex);
	}
	return nOffset;
}

// Получение текущей строки и внутренней позиции курсора
function getCurrentLine () {
	var nCaretPos;
	var nLineStart;
	var nLineEnd;
	var sCurrentLine;

	nCaretPos = GetOffset(hWndEdit, 5 /*AEGI_CARETCHAR*/, -1); 
	nLineStart = GetOffset(hWndEdit, 18 /*AEGI_WRAPLINEBEGIN*/, nCaretPos);
	nLineEnd = GetOffset(hWndEdit, 19 /*AEGI_WRAPLINEEND*/, nCaretPos); 
	sCurrentLine = AkelPad.GetTextRange(nLineStart, nLineEnd);

	return [sCurrentLine, nCaretPos - nLineStart - 1];
}

if (hWndEdit !== hWndFocus) {
	WScript.Quit();
}

localize(oScrArgs);

aCurrentLineWithCaretPos = getCurrentLine();

FileMaker = function (sSelText, oParams) {
	this.sSelText = sSelText;
	this.sExts = oParams.sExts; 
	this.rSel = new RegExp("^([^\\\\:\"*?<>|\\r\\n]*/)?([^\\\\/:\"*?<>|\\r\\n]+?\\.(?:" + this.sExts + ")$)", "i");
	this.rCurPath = /^.*\\/;
	this.sCurPath = (oParams.sCurPath || WScript.Quit()).match(this.rCurPath)[0];
	this.oFso = new ActiveXObject("Scripting.FileSystemObject");
	this.sNewFilePath = "";
	this.sLngFile = oParams.sLngFile;
	this.sLngCreate = oParams.sLngCreate;
	this.nIsConfirmMsg = oParams.nIsConfirmMsg;
	this.nIsForceQuotes = oParams.nIsForceQuotes;
	this.bCallConfirmMsg = false;

	this.init();
};

FileMaker.prototype = {
	constructor: FileMaker,
	checkSelText: function (selText, rPattern) {
		var aMatched;

		if (!this.nIsForceQuotes) {
			if ( !(aMatched = selText.match(rPattern)) ) WScript.Quit();
		}
		else {
			if ( !(aMatched = selText.match(rPattern)) ) { // нет выделения или оно "неправильное"
				if ( !(aMatched = this.getStrBetweenQuotes(aCurrentLineWithCaretPos).match(rPattern)) ) WScript.Quit();
			}
		}

		return aMatched;
	},
	analyzeMatch: function () {
		var oResult;
		
		this.aSelMatched = this.checkSelText(this.sSelText, this.rSel);
		oResult = {
			sFileName: this.aSelMatched[2]
		};
		if (this.aSelMatched[1] !== "") {
			oResult.aSubFolders = this.aSelMatched[1].split(/\//);
		}
		this.sNewFilePath = this.sCurPath + this.aSelMatched[0].replace(/\//g, "\\");

		return oResult;
	},
	getStrBetweenQuotes: function (aParams) {
		var sCurStr = aParams[0];
		var nCaretPos = aParams[1];
		var nleftSingleQoute = sCurStr.lastIndexOf("'", nCaretPos);
		var nleftDoubleQoute = sCurStr.lastIndexOf('"', nCaretPos);
		var rBetweenQuotes;
		var sNearestQuote;
		var sSubStr;
		var sMatchedStr;

		if ( (nleftDoubleQoute === -1) && (nleftSingleQoute === -1) ) WScript.Quit(); // слева от курсора нет кавычек
		if ( (nleftDoubleQoute > -1) && (nleftSingleQoute === -1) ) {
			sNearestQuote = '"';
			sSubStr = sCurStr.slice(nleftDoubleQoute);
		}
		if ( (nleftDoubleQoute === -1) && (nleftSingleQoute > -1) ) {
			sNearestQuote = "'";
			sSubStr = sCurStr.slice(nleftSingleQoute);
		}
		if ( (nleftDoubleQoute > -1) && (nleftSingleQoute > -1) ) {
			if (nleftDoubleQoute > nleftSingleQoute) {
				sNearestQuote = '"';
				sSubStr = sCurStr.slice(nleftDoubleQoute);
			}
			else {
				sNearestQuote = "'";
				sSubStr = sCurStr.slice(nleftSingleQoute);
			}
		}
		rBetweenQuotes = new RegExp(sNearestQuote + "([^\'\"]+)" + sNearestQuote);
		if ( sMatchedStr = sSubStr.match(rBetweenQuotes) ) {
			sMatchedStr = sMatchedStr[1];
		}
		else { // справа от курсора нет подходящей кавычки
			WScript.Quit();
		}

		return sMatchedStr;
	},
	showConfirmMsg: function() {
		if (!this.nIsConfirmMsg) return;
		if (this.bCallConfirmMsg) return;
		this.bCallConfirmMsg = true;
		if ( AkelPad.MessageBox(hWndMain, this.sLngFile + this.sNewFilePath + this.sLngCreate, WScript.ScriptName, 4 /*MB_YESNO*/ + 32 /*MB_ICONQUESTION*/) === 7 /*IDNO*/ ) {
			WScript.Quit();
		}
	},
	createFile: function() {
		if ( this.oFso.FileExists(this.sNewFilePath) ) {
			AkelPad.OpenFile(this.sNewFilePath);
		} else {
			this.showConfirmMsg();
			AkelPad.Command(4101, 1); /*IDM_FILE_NEW*/
			AkelPad.SaveFile(0, this.sNewFilePath, -1, -1, 0x1 /*SD_UPDATE*/);
		}
	},
	createSubFolders: function(sCurPath, aSubFolders) {
		var i;
		var length = aSubFolders.length;
		var pExplorer = "Explorer::Main";

		for (i = 0; i < length; i++) {
			sCurPath = sCurPath + aSubFolders[i] + "\\";
			if ( this.oFso.FolderExists(sCurPath) ) {
				continue;
			} else {
				this.showConfirmMsg();
				this.oFso.CreateFolder(sCurPath);
			}
		}
		if ( AkelPad.IsPluginRunning(pExplorer) ) {
			AkelPad.Call(pExplorer, 2);
		}
	},
	processing: function(oMatch) {
		if (oMatch.sFileName && oMatch.aSubFolders) {
			this.createSubFolders(this.sCurPath, oMatch.aSubFolders);
			this.createFile();
		} else {
			this.createFile();
		}
	},
	init: function () {
		var oMatch = this.analyzeMatch();
		this.processing(oMatch);
	}
};

new FileMaker(pSelText, oScrArgs);
