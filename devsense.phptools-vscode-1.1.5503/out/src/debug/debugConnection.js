"use strict";Object.defineProperty(exports,"__esModule",{value:!0});const O=require("events"),dt=require("iconv-lite"),Kt=require("xmldom");var ss;exports.ENCODING="iso-8859-1",function(s){s[s.DataLength=0]="DataLength",s[s.Response=1]="Response"}(ss||(ss={}));class ts extends O.EventEmitter{constructor(s){super(),this.W=s,this.Z=ss.DataLength,this.ss=0,this.ts=[],s.on("data",s=>this.rs(s)),s.on("error",s=>this.emit("error",s)),s.on("close",()=>this.emit("close"))}rs(s){if(this.Z===ss.DataLength){const t=s.indexOf(0);if(-1!==t){const i=s.slice(0,t);if(this.ts.push(i),this.ss+=i.length,this.es=parseInt(dt.decode(Buffer.concat(this.ts,this.ss),exports.ENCODING)),this.ts=[],this.ss=0,this.Z=ss.Response,s.length>t+1){const i=s.slice(t+1);this.rs(i)}}else this.ts.push(s),this.ss+=s.length}else if(this.Z===ss.Response)if(this.ss+s.length>=this.es){const t=s.slice(0,this.es-this.ss);this.ts.push(t),this.ss+=s.length;const i=Buffer.concat(this.ts,this.ss),r=dt.decode(i,exports.ENCODING),e=new Kt.DOMParser({errorHandler:{warning:s=>{this.emit("warning",s)},error:s=>{this.emit("error",s instanceof Error?s:new Error(s))},fatalError:s=>{this.emit("error",s instanceof Error?s:new Error(s))}}}).parseFromString(r,"application/xml");if(this.emit("message",e),this.ts=[],this.ss=0,this.Z=ss.DataLength,s.length>t.length+1){const i=s.slice(t.length+1);this.rs(i)}}else this.ts.push(s),this.ss+=s.length}write(s){return new Promise((t,i)=>{this.W.writable?this.W.write(s,()=>{t()}):i(new Error("socket not writable"))})}close(){return new Promise((s,t)=>{this.W.once("close",s),this.W.end()})}}exports.DbgpConnection=ts;