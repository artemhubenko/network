
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("<int:post_id>/like/", views.like_post, name="like_post"),

    path("api/posts", views.posts, name="api_posts"),

    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register")
]
