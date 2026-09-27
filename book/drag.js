export function initDrag(renderer, camera, bookRef, onDragStart, onDragEnd) {
    const { book, introTl, targetRot } = bookRef;
    let drag = false, prevX = 0, prevY = 0;

    function startDrag(clientX, clientY) {
        if (window._focusLock || window._orbitMode) return;
        drag = true;
        prevX = clientX;
        prevY = clientY;
        introTl.kill();
        gsap.killTweensOf(book.rotation);
        targetRot.x = book.rotation.x;
        targetRot.y = book.rotation.y;
        onDragStart();
    }

    function moveDrag(clientX, clientY) {
        if (!drag) return;
        targetRot.y += (clientX - prevX) * 0.012;
        targetRot.x += (clientY - prevY) * 0.007;
        prevX = clientX;
        prevY = clientY;
    }

    function endDrag() {
        drag = false;
        onDragEnd();
    }

    renderer.domElement.addEventListener('mousedown',  e => startDrag(e.clientX, e.clientY));
    renderer.domElement.addEventListener('mousemove',  e => moveDrag(e.clientX, e.clientY));
    renderer.domElement.addEventListener('mouseup',    endDrag);
    renderer.domElement.addEventListener('mouseleave', endDrag);

    // preventDefault() sur touchstart supprime le "click" de synthèse que le
    // navigateur génère normalement après un tap — indispensable pour bloquer
    // le scroll pendant un vrai drag, mais ça tuait aussi le tap sur les
    // hotspots (sommaire, portail Oblivion) en mode focus/orbite, où aucun
    // drag ne démarre jamais (cf. garde dans startDrag). Solution : ne faire
    // preventDefault()/démarrer le drag QUE si on va réellement s'en servir.
    renderer.domElement.addEventListener('touchstart', e => {
        if (window._focusLock || window._orbitMode) return;
        e.preventDefault();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    renderer.domElement.addEventListener('touchmove', e => {
        if (!drag) return;
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', endDrag);

    renderer.domElement.addEventListener('wheel', e => {
        if (window._focusLock || window._orbitMode) return;
        camera.position.z = Math.max(1, Math.min(5, camera.position.z + e.deltaY * 0.004));
    }, { passive: true });
}
