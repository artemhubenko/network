import json
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from . import forms
import time
from django.utils.timezone import localtime 



from .models import User, Post


def index(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return redirect('login')
        form = forms.CreatePost(request.POST)
        if form.is_valid:
            new_post = form.save(commit=False)
            new_post.author = request.user
            new_post.save()
            form = forms.CreatePost()
            return redirect('index')
    else:
        form = forms.CreatePost()
    return render(request, "network/index.html", {
        "form": form,
    })

def like_post(request, post_id):

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Auth required"}, status=401)


    try: 
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404) 

    if request.method != "PUT": 
        return JsonResponse({"error": "PUT request is required."}, status=400)
    
    if post.liked.filter(id=request.user.id).exists():
        post.liked.remove(request.user)
        liked = False
    else:
        post.liked.add(request.user)
        liked = True

    return JsonResponse({
        "likes_count": post.liked.count(),
        "liked": liked
    })
        


def posts(request):
    username = request.GET.get("username")
    filter = request.GET.get("filter")
    if username:
        postings = Post.objects.filter(author__username=username)
    elif filter == 'following' and request.user.is_authenticated:
        postings = Post.objects.filter(author__in=request.user.following.all())
    else:
        postings = Post.objects.all()
    postings = postings.order_by('-timestamp')

    offset = int(request.GET.get("offset") or 0)
    limit = int(request.GET.get("limit") or (offset + 9))

    chunks = postings[offset:offset + limit]

    data = []
    for chunk in chunks: 
        data.append({
            "id": chunk.id,
            "author": chunk.author.username,
            "content": chunk.content,
            "timestamp": localtime(chunk.timestamp).strftime("%Y-%m-%d %H:%M"),
            "likes_count": chunk.liked.count(),
            "liked_by_me": chunk.liked.filter(id=request.user.id).exists(),
            "is_mine": request.user == chunk.author,
        })

    return JsonResponse({"posts": data}, safe=False)

def profile(request):
    user = request.user
    posts = Post.objects.filter(author=user).order_by('-timestamp')
    return render(request, 'network/profile.html', {
        "user": user,
    })

def user_profile(request, username):
    user = get_object_or_404(User, username=username)
    is_followed = request.user.following.filter(id=user.id).exists()
    return render(request, 'network/profile.html', {
        "user": user,
        "is_followed": is_followed,
    })

def follow(request, username):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Auth required"}, status=401)
    fetch_user = request.user
    try: 
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404) 
    
    user_id = user.id

    if request.method != "PUT": 
        return JsonResponse({"error": "PUT request is required."}, status=400)

    if fetch_user.following.filter(id=user_id).exists():
        fetch_user.following.remove(user)
        subscribed = False
    else:
        fetch_user.following.add(user)
        subscribed = True

    return JsonResponse({
        "followers_count": user.followers.count(),
        "subscribed": subscribed,
    })

def edit(request, post_id):
    try: 
        post = Post.objects.get(pk=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found"}, status=404)

    if request.user != post.author:
        return JsonResponse({"error": "You are not allowed to edit this post"}, status=403)
    
    if request.method != "PUT": 
        return JsonResponse({"error": "PUT request is required."}, status=400)
    
    data = json.loads(request.body)
    new_content = data.get("new_content", "")
    post.content = new_content
    post.save()

    return JsonResponse({
        "new_content": post.content,
    })
    


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
