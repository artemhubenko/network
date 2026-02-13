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
    document.querySelector('#following-link').addEventListener('click', load_followings);
    document.querySelector('#all-posts-link').addEventListener('click', () => {
        document.querySelector('#posts-feed').innerHTML = '';
        counter = 0;
        document.querySelector('.new-post-card').style.display = 'flex';
        load();
    });
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

function load_followings() {

    document.querySelector('#posts-feed').innerHTML = '';
    counter = 0;

    document.querySelector('.new-post-card').style.display = 'none';

    const start = counter;
    const end = start + quantity - 1;
    counter = end + 1;

    fetch(`/api/posts?offset=${start}&limit=${quantity}&filter=following`)
    .then(res => res.json())
    .then(data => {
        data.posts.forEach(add_post);
    })
};

function add_post(post) {

    const post_card = document.createElement('div');
    post_card.className = 'card post-card mb-3';
    post_card.innerHTML = `
        <div class="card-body">
            <div class="div-card-text">
                <h6 class="card-subtitle mb-2 post-author"><a href="/profile/${post.author}"> ${post.author} </a> • ${post.timestamp}</h6>
                <p class="card-text"></p>
            </div>
            <div class="post-actions">
                <span class="likes ${post.liked_by_me ? 'liked' : ''}" data-post-id="${post.id}" data-liked="${post.liked_by_me}">❤️ <span class="likes-count">${post.likes_count}</span></span>
            </div>
        </div>
    `;
    post_card.querySelector('.card-text').textContent = post.content;

    if (post.is_mine) {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'edit-btn';
        editBtn.dataset.postId = post.id;

        post_card.querySelector('.post-actions').appendChild(editBtn);

        editBtn.addEventListener('click', function() {
            const postId = this.dataset.postId;
 
            const cardText = post_card.querySelector(".div-card-text");
            const originalText = cardText.querySelector(".card-text").textContent;
            
            const postActions = post_card.querySelector('.post-actions');
            postActions.style.display = 'none';

            const editContainer = document.createElement('div');
            editContainer.className = 'edit-container';

            const editField = document.createElement('textarea');
            editField.className = 'edit-field';
            editField.value = originalText;
            editContainer.appendChild(editField);
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'submit-edit-btn';
            saveBtn.textContent = 'Save';
            editContainer.appendChild(saveBtn);

            cardText.innerHTML = '';
            cardText.appendChild(editContainer);
            
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    editContainer.style.display = 'none';
                    postActions.style.display = 'flex';
                    cardText.innerHTML = `
                    <h6 class="card-subtitle mb-2 post-author">
                        <a href="/profile/${post.author}">${post.author}</a> • ${post.timestamp}
                    </h6>
                    <p class="card-text"></p>
                    `;
                    cardText.querySelector('.card-text').textContent = originalText;
                }

                if(event.ctrlKey && event.key === 'Enter') {
                    saveEditedPost({
                    postId: post.id,
                    newContent: editField.value,
                    postCard: post_card,
                    postActions: postActions,
                    author: post.author,
                    timestamp: post.timestamp
                    });
                }
            });
            
            saveBtn.addEventListener('click', () => {
                saveEditedPost({
                    postId: post.id,
                    newContent: editField.value,
                    postCard: post_card,
                    postActions: postActions,
                    author: post.author,
                    timestamp: post.timestamp
                });   
            });
            
        });
    }

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

function saveEditedPost({
    postId,
    newContent,
    postCard,
    postActions,
    author,
    timestamp
}) {

    fetch(`/${postId}/edit/`, {
    method: 'PUT',
    headers: {
        'Content-type': 'application/json',
        'X-CSRFToken': csrftoken
    },
    body: JSON.stringify({
        new_content: newContent
    })
    })
    .then(res => res.json())
    .then(data => {
        const cardText = postCard.querySelector('.div-card-text');

        cardText.innerHTML = `
        <h6 class="card-subtitle mb-2 post-author">
            <a href="/profile/${author}">${author}</a> • ${timestamp}
        </h6>
        <p class="card-text"></p>
    `;
        cardText.querySelector('.card-text').textContent = data.new_content;
        postActions.style.display = 'flex';
    })
    .catch(err => {
    console.error("Error:", err);
    cardText.innerHTML = `
        <h6 class="card-subtitle mb-2 post-author">
            <a href="/profile/${post.author}">${post.author}</a> • ${post.timestamp}
        </h6>
        <p class="card-text">${originalText}</p>
    `;
    postActions.style.display = 'flex';
    });
}