"use strict";var e=this&&this.t||function(t,s,i,e){return new(i||(i=Promise))(function(h,o){function r(t){try{c(e.next(t))}catch(t){o(t)}}function n(t){try{c(e.throw(t))}catch(t){o(t)}}function c(t){var s;t.done?h(t.value):(s=t.value,s instanceof i?s:new i(function(t){t(s)})).then(r,n)}c((e=e.apply(t,s||[])).next())})};Object.defineProperty(exports,"__esModule",{value:!0});const r=require("vscode"),ls=require("./testSuiteNode"),ps=require("./testNode");class fs{constructor(t,s){this.adapter=t,this.explorer=s,this.disposables=[],this.nodesById=new Map,this.locatedNodes=new Map,this.codeLenses=new Map,this.collectionChangedWhileRunning=!1;const i=t.workspaceFolder?t.workspaceFolder.uri:void 0;this.disposables.push(r.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("phpTools.phpUnit.codeLens",i)&&this.computeCodeLenses(),(t.affectsConfiguration("phpTools.phpUnit.gutterDecoration",i)||t.affectsConfiguration("phpTools.phpUnit.errorDecoration",i))&&this.explorer.decorator.updateDecorationsNow()})),t.testStates(t=>{if(void 0!==this.rootSuite){if("suite"===t.type){const s="string"==typeof t.suite?t.suite:t.suite.id,i=this.nodesById.get(s);let e=i&&"suite"===i.info.type?i:void 0;"running"===t.state?(!e&&this.runningSuite&&"object"==typeof t.suite&&(this.runningSuite.info.children.push(t.suite),e=new ls.TestSuiteNode(this,t.suite,this.runningSuite),this.runningSuite.children.push(e),this.runningSuite.neededUpdates="recalc",this.nodesById.set(s,e),this.collectionChangedWhileRunning=!0),e&&(this.runningSuite=e)):this.runningSuite&&(this.runningSuite=this.runningSuite.parent)}else{const s="string"==typeof t.test?t.test:t.test.id,i=this.nodesById.get(s);let e=i&&"test"===i.info.type?i:void 0;!e&&this.runningSuite&&"object"==typeof t.test&&(this.runningSuite.info.children.push(t.test),e=new ps.TestNode(this,t.test,this.runningSuite),this.runningSuite.children.push(e),this.runningSuite.neededUpdates="recalc",this.nodesById.set(s,e),this.collectionChangedWhileRunning=!0),e&&e.setCurrentState(t.state,t.message,t.decorations)}this.sendNodeChangedEvents()}}),t.reload&&t.reload(()=>this.explorer.scheduler.scheduleReload(this,!0)),t.autorun&&t.autorun(()=>{this.Lt&&this.explorer.run([this.Lt])})}get suite(){return this.rootSuite}get autorunNode(){return this.Lt}loadTests(){return e(this,void 0,void 0,function*(){let t;try{t=yield this.adapter.load()}catch(t){return void r.window.showErrorMessage(`Error while loading tests: ${t} at ${t.stack}.`)}if(t?(this.rootSuite=new ls.TestSuiteNode(this,t,void 0,this.nodesById),this.shouldRetireStateOnReload()?this.rootSuite.retireState():this.shouldResetStateOnReload()&&this.rootSuite.resetState()):this.rootSuite=void 0,this.nodesById.clear(),this.rootSuite&&this.collectNodesById(this.rootSuite),this.Lt){const t=this.nodesById.get(this.Lt.info.id);this.setAutorun(t)}this.runningSuite=void 0,this.computeCodeLenses(),this.explorer.decorator.updateDecorationsNow(),this.explorer.treeEvents.sendTreeChangedEvent()})}testRunStarting(){this.collectionChangedWhileRunning=!1}testRunFinished(){this.collectionChangedWhileRunning&&(this.collectionChangedWhileRunning=!1,this.computeCodeLenses())}recalcState(){this.rootSuite&&this.rootSuite.recalcState()}retireState(t){t?(t.retireState(),t.parent&&(t.parent.neededUpdates="recalc")):this.rootSuite&&this.rootSuite.retireState(),this.sendNodeChangedEvents()}resetState(t){t?(t.resetState(),t.parent&&(t.parent.neededUpdates="recalc")):this.rootSuite&&this.rootSuite.resetState(),this.sendNodeChangedEvents()}setAutorun(t){this.Lt&&(this.Lt.setAutorun(!1),this.Lt.parent&&(this.Lt.parent.neededUpdates="recalc"),this.Lt=void 0),this.rootSuite&&t&&(t.setAutorun(!0),t.parent&&(t.parent.neededUpdates="recalc"),this.Lt=t),this.explorer.treeEvents.sendNodeChangedEvents(!0)}sendNodeChangedEvents(){this.explorer.treeEvents.sendNodeChangedEvents(!1)}shouldRetireStateOnStart(){return"retire"===this.getConfiguration().get("onStart")}shouldResetStateOnStart(){return"reset"===this.getConfiguration().get("onStart")}shouldRetireStateOnReload(){return"retire"===this.getConfiguration().get("onReload")}shouldResetStateOnReload(){return"reset"===this.getConfiguration().get("onReload")}shouldShowCodeLens(){return!1!==this.getConfiguration().get("codeLens")}shouldShowGutterDecoration(){return!1!==this.getConfiguration().get("gutterDecoration")}shouldShowErrorDecoration(){return!1!==this.getConfiguration().get("errorDecoration")}computeCodeLenses(){if(this.codeLenses.clear(),this.locatedNodes.clear(),void 0!==this.rootSuite&&(this.collectLocatedNodes(this.rootSuite),this.shouldShowCodeLens()))for(const[t,s]of this.locatedNodes){const i=[];for(const[t,e]of s)i.push(this.createRunCodeLens(t,e)),i.push(this.createDebugCodeLens(t,e));this.codeLenses.set(t,i)}this.explorer.codeLensesChanged.fire()}getCodeLenses(t){return this.codeLenses.get(t)||[]}getLocatedNodes(t){return this.locatedNodes.get(t)}dispose(){for(const t of this.disposables)t.dispose();this.disposables=[]}getConfiguration(){const t=this.adapter.workspaceFolder;var s=t?t.uri:void 0;return r.workspace.getConfiguration("testExplorer",s)}collectNodesById(t){this.nodesById.set(t.info.id,t);for(const s of t.children)this.collectNodesById(s)}collectLocatedNodes(t){this.addLocatedNode(t);for(const s of t.children)"test"===s.info.type?this.addLocatedNode(s):this.collectLocatedNodes(s)}addLocatedNode(t){if(void 0===t.info.file||void 0===t.info.line)return;let s=this.locatedNodes.get(t.info.file);s||(s=new Map,this.locatedNodes.set(t.info.file,s));let i=s.get(t.info.line);i||(i=[],s.set(t.info.line,i)),i.push(t)}createRunCodeLens(t,s){const i=new r.Range(t,0,t,0);return new r.CodeLens(i,{title:"Run",command:"phpTools.phpUnit.run",arguments:s})}createDebugCodeLens(t,s){const i=new r.Range(t,0,t,0);return new r.CodeLens(i,{title:"Debug",command:"phpTools.phpUnit.debug",arguments:s})}}exports.TestCollection=fs;