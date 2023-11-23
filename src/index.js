function toggleNotification(bell) {
    if(bell.innerText === 'notifications') {
        bell.innerText = 'notifications_none';
    } else {
        bell.innerText = 'notifications';
    }
}