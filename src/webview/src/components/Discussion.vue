<script>
import Note from './Note';
import CommentForm from './CommentForm';
import icons from '../assets/icons';

export default {
  name: 'Discussion',
  props: {
    noteable: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isRepliesVisible: true,
      isEditing: false,
      reply: '',
    };
  },
  components: {
    Note,
    CommentForm,
  },
  computed: {
    initialDiscussion() {
      return this.noteable.notes.nodes[0];
    },
    replies() {
      return this.noteable.notes.nodes.slice(1);
    },
    hasReplies() {
      return this.replies.length > 0;
    },
    toggleRepliesText() {
      return this.isRepliesVisible ? 'Collapse replies' : 'Expand replies';
    },
    toggleRepliesIcon() {
      return this.isRepliesVisible ? this.chevronDownSvg : this.chevronRightSvg;
    },
  },
  methods: {
    toggleReplies() {
      this.isRepliesVisible = !this.isRepliesVisible;
    },
    toggleEditting() {
      this.isEditing = !this.isEditing;
    },
  },
  created() {
    this.chevronDownSvg = icons.chevronDown;
    this.chevronRightSvg = icons.chevronRight;
  },
};
</script>

<template>
  <div class="discussion">
    <note :noteable="initialDiscussion" />
    <button v-if="hasReplies" @click="toggleReplies" class="collapse js-collapse">
      <span class="chevron" v-html="toggleRepliesIcon" /> {{ toggleRepliesText }}
    </button>
    <template v-if="isRepliesVisible">
      <note v-for="note in replies" :key="note.id" :noteable="note" />
      <button v-if="!isEditing" class="reply js-reply" @click="toggleEditting">Reply</button>
      <comment-form v-if="isEditing" :reply-id="noteable.replyId" @cancel-edit="toggleEditting" />
    </template>
  </div>
</template>

<style lang="scss">
.discussion {
  margin-top: 16px;
  border: 1px solid;
  border-color: var(--vscode-panel-border);
  border-radius: 4px;
  background: var(--vscode-editor-background);

  > .note {
    border: none;
    margin: 0;
  }

  .chevron svg {
    width: 10px;
    height: 10px;
  }

  .collapse,
  .reply {
    display: inline-block;
    border: none;
    color: inherit;
    background: inherit;
    margin: 8px 16px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: inherit;
    outline: 0;
    &:hover,
    &:focus {
      text-decoration: underline;
    }
    &:last-child {
      margin-bottom: 16px;
    }
  }
}
</style>
