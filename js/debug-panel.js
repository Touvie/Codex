(function() {
    function applyAll() {
        const lv = window._leaves;
        if (!lv || !lv.length) { document.getElementById('debug-out').textContent = '_leaves non prêt'; return; }
        const px=parseFloat(document.getElementById('d-pivot-x').value);
        const py=parseFloat(document.getElementById('d-pivot-y').value);
        const pz=parseFloat(document.getElementById('d-pivot-z').value);
        const mx=parseFloat(document.getElementById('d-mesh-x').value);
        const ext=parseFloat(document.getElementById('d-ext').value);
        const mrx=parseFloat(document.getElementById('d-mrx').value)*Math.PI/180;
        const mry=parseFloat(document.getElementById('d-mry').value)*Math.PI/180;
        const mrz=parseFloat(document.getElementById('d-mrz').value)*Math.PI/180;
        const fold=parseFloat(document.getElementById('d-fold').value)*Math.PI/180;
        const tilt=parseFloat(document.getElementById('d-tilt').value)*Math.PI/180;
        if(window._setFold) window._setFold(fold);
        if(window._setTilt) window._setTilt(tilt);
        lv.forEach((g,i)=>{
            if(i===2)return;
            g.position.x=px; g.position.y=py; g.position.z=pz+i*0.001;
            const m=g.children[0];
            if(m){
                const baseX=Math.abs(mx), newW=baseX*2+ext, scale=newW/(baseX*2);
                m.scale.x=scale; m.position.x=(i===0)?-(baseX+ext/2):(baseX+ext/2);
                m.rotation.set(mrx,mry,mrz);
            }
        });
        document.getElementById('debug-out').textContent=`pivotX:${px.toFixed(2)} pivotZ:${pz.toFixed(3)} fold:${(fold*180/Math.PI).toFixed(0)}°`;
    }
    document.getElementById('d-scale').addEventListener('input', function() {
        const s = parseFloat(this.value);
        document.getElementById('v-scale').textContent = s.toFixed(2);
        if (window._book) window._book.scale.set(s, s, s);
    });
    document.querySelector('button[data-for="d-scale"]').addEventListener('click', function() {
        const input = document.getElementById('d-scale');
        input.value = input.dataset.default;
        input.dispatchEvent(new Event('input'));
    });
    const fields=[['d-pivot-x','v-pivot-x',v=>v.toFixed(2)],['d-pivot-y','v-pivot-y',v=>v.toFixed(2)],['d-pivot-z','v-pivot-z',v=>v.toFixed(3)],['d-mesh-x','v-mesh-x',v=>v.toFixed(2)],['d-ext','v-ext',v=>v.toFixed(2)],['d-mrx','v-mrx',v=>v+'°'],['d-mry','v-mry',v=>v+'°'],['d-mrz','v-mrz',v=>v+'°'],['d-fold','v-fold',v=>v+'°'],['d-tilt','v-tilt',v=>v+'°']];
    fields.forEach(([sid,vid,fmt])=>{
        document.getElementById(sid).addEventListener('input',function(){document.getElementById(vid).textContent=fmt(parseFloat(this.value));applyAll();});
    });
    document.querySelectorAll('#debug-panel button.rst').forEach(btn=>{
        btn.addEventListener('click',()=>{const input=document.getElementById(btn.dataset.for);input.value=input.dataset.default;input.dispatchEvent(new Event('input'));});
    });
    document.querySelectorAll('.galaxy-theme-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{ if (window._setGalaxyTheme) window._setGalaxyTheme(btn.dataset.theme); });
    });
    document.getElementById('d-galaxy-orient').addEventListener('input', function() {
        document.getElementById('v-galaxy-orient').textContent = parseFloat(this.value).toFixed(2);
        if (window._setGalaxyOrientation) window._setGalaxyOrientation(parseFloat(this.value));
    });
    document.getElementById('d-gold-color').addEventListener('input', function() {
        if (window._setGoldColor) window._setGoldColor(this.value);
    });
    document.getElementById('d-gold-thick').addEventListener('input', function() {
        document.getElementById('v-gold-thick').textContent = parseFloat(this.value).toFixed(2);
        if (window._setGoldThickness) window._setGoldThickness(parseFloat(this.value));
    });
    document.getElementById('d-gold-metal').addEventListener('input', function() {
        document.getElementById('v-gold-metal').textContent = parseFloat(this.value).toFixed(2);
        if (window._setGoldMetalness) window._setGoldMetalness(parseFloat(this.value));
    });
})();
