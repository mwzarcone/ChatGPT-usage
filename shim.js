/* Minimal runtime that replaces the Claude dashboard host: serves the bundled datasets to app.js. */
(function(){
  var D=window.DATA||{},calcs={},listeners=[];
  function get(id){return D[id]||calcs[id];}
  window.dash={
    colors:['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)','var(--chart-6)','var(--chart-7)','var(--chart-8)'],
    data:function(id){var v=get(id);return {status:v?'ok':'missing',data:v||[],message:'',refreshing:false,meta:[]};},
    calc:function(id,o){calcs[id]=o.fn.apply(null,o.inputs.map(get));},
    onData:function(fn){listeners.push(fn);fn();},
    setLink:function(name){try{history.replaceState(null,'','#'+name);}catch(e){}},
    params:function(){return {};},setParams:function(){},resetParams:function(){},refresh:function(){},loader:function(){}
  };
  var t;window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(function(){listeners.forEach(function(f){f();});},150);});
})();
