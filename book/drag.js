export function initDrag(renderer, camera, bookRef, onDragStart, onDragEnd) {
    const { book, introTl, targetRot } = bookRef;
    let drag = false, prevX = 0, prevY = 0;

    function startDrag(clientX, clientY) {
        if (window._focusLock) return;
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

    renderer.domElement.addEventListener('touchstart', e => {
        e.preventDefault();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    renderer.domElement.addEventListener('touchmove', e => {
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', endDrag);

    renderer.domElement.addEventListener('wheel', e => {
        if (window._focusLock) return;
        camera.position.z = Math.max(1, Math.min(5, camera.position.z + e.deltaY * 0.004));
    }, { passive: true });
}
