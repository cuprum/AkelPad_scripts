// [createSelectedFile.js]
// http://akelpad.sourceforge.net/forum/viewtopic.php?p=26939#26939 
// https://github.com/cuprum/AkelPad_scripts/blob/master/createSelectedFile.js
//
// Cuprum (c) 2014
//
// Создание файла на основе выделения.
// Файл создается, когда выделенный текст является названием файла (имя + расширение) или относительным путем, оканчивающимся файлом;
// расширение файла внутри выделенного фрагмента должно соответствовать определенному значению (см. -exts в описании аргументов).
// Если файл уже существует, то он будет открыт.
//
// Allow to create file from selection. Selection must be file (name + extension) or relative path with file.
// File extension must matched with list (see -exts in 'Arguments' section).
// If a selected file exists, it will be opened.
//
// Arguments:
//    -path="%f"                     Required argument.
//    -msg                           Show dialog box before creating file.
//    -exts="ext1|ext2|ext3|ext4|"   Set custom file extensions. Default is "js|css|less".
//
// Usage:
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f"`)
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f" -exts="css|js|less|htm|html"`)
//    Call("Scripts::Main", 1, "createSelectedFile.js", `-path="%f" -msg -exts="css|js|less|htm|html"`)
//
// Versions:
//    1.0 (11.12.2014)
//      Initial release.


var FileMaker;
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
		nIsMsg: AkelPad.GetArgValue("msg", 0),
		sExts: AkelPad.GetArgValue("exts", "js|css|less")
	};

localize(oScrArgs);

if (hWndEdit !== hWndFocus) {
	WScript.Quit();
}

FileMaker = function(selText, oParams) {
	var exts = oParams.sExts;
	var rSel = new RegExp("^([^:]*/)?([^\\/:*?]+?\\.(?:" + exts + ")$)", "i");
	var rCurPath = /^.*\\/;

	this.oFso = new ActiveXObject("Scripting.FileSystemObject");
	this.sCurPath = (oParams.sCurPath || WScript.Quit()).match(rCurPath)[0];
	this.aSelMatched = selText.match(rSel);
	this.sNewFilePath = "";
	this.nIsConfirmMsg = oParams.nIsMsg;
	this.bCallConfirmMsg = false;
	this.sLngFile = oParams.sLngFile;
	this.sLngCreate = oParams.sLngCreate;

	this.init();
};

FileMaker.prototype = {
	constructor: FileMaker,
	validateSelMatch: function () {
		if (this.aSelMatched === null) {
			WScript.Quit();
		}

		var oMatch = {
			sFileName: this.aSelMatched[2]
		};

		if (this.aSelMatched[1] !== "") {
			oMatch.aSubFolders = this.aSelMatched[1].split(/\//);
		}
		this.sNewFilePath = this.sCurPath + this.aSelMatched[0].replace(/\//g, "\\");
		return oMatch;
	},
	showConfirmMsg: function() {
		if (!this.nIsConfirmMsg) return;
		if (this.bCallConfirmMsg) return;
		this.bCallConfirmMsg = true;
		if (AkelPad.MessageBox(hWndMain, this.sLngFile + this.sNewFilePath + this.sLngCreate, WScript.ScriptName, 4 /*MB_YESNO*/ + 32 /*MB_ICONQUESTION*/) === 7 /*IDNO*/) {
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
				if (AkelPad.IsPluginRunning(pExplorer)) {
						AkelPad.Call(pExplorer, 2);
				}
			}
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
		var oMatch = this.validateSelMatch();
		this.processing(oMatch);
	}
};

new FileMaker(pSelText, oScrArgs);
