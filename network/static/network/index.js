let counter = 0;

const quantity = 10;

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

document.addEventListener('DOMContentLoaded', () => {
    load();
});

window.onscroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        load();
    }
};

function load() {

    const start = counter;
    const end = start + quantity - 1;
    counter = end + 1;

    fetch(`api/posts?offset=${start}&limit=${quantity}`)
    .then(response => response.json())
    .then(data => {
        data.posts.forEach(add_post);
    })

};

function add_post(post) {

    const post_card = document.createElement('div');
    post_card.className = 'card post-card mb-3';
    post_card.innerHTML = `
        <div class="card-body">
            <h6 class="card-subtitle mb-2 post-author"><a href="/profile/${post.author}"> ${post.author} </a> • ${post.timestamp}</h6>
            <p class="card-text">${post.content}</p>
            <div class="post-actions">
                <span class="likes ${post.liked_by_me ? 'liked' : ''}" data-post-id="${post.id}" data-liked="${post.liked_by_me}">❤️ <span class="likes-count">${post.likes_count}</span></span>
            </div>
        </div>
    `;

    const likeEl = post_card.querySelector('.likes');

        likeEl.onclick = function() {
            const postId = this.dataset.postId;
            const likeNow = this.dataset.liked === 'true';
            const newLikeState = !likeNow;


            fetch(`/${postId}/like/`, {
                method: 'PUT',
                headers: {
                    'Content-type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                body: JSON.stringify({
                    liked: newLikeState
                })
            })
            .then(res => res.json())
            .then(data => {
                this.dataset.liked = data.liked;
                this.querySelector('.likes-count').textContent = data.likes_count;

                if (data.liked) {
                    this.classList.add('liked');
                } else {
                    this.classList.remove('liked');
                }
            });
        };

    document.querySelector("#posts-feed").append(post_card);

};

